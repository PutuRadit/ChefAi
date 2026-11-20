package id.my.nakena

import android.annotation.SuppressLint
import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.ClipData
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.net.http.SslError
import android.os.Bundle
import android.provider.MediaStore
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Base64
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.webkit.SslErrorHandler
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.ActivityResult
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.FileProvider
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import java.io.File
import java.io.IOException
import java.security.GeneralSecurityException
import java.security.KeyStore
import java.util.Locale
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import org.json.JSONException
import org.json.JSONObject

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private lateinit var startupOverlay: LinearLayout
    private lateinit var loadingIndicator: ProgressBar
    private lateinit var startupMessage: TextView
    private lateinit var retryButton: Button
    private lateinit var chooserLauncher: ActivityResultLauncher<Intent>
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var cameraOutputUri: Uri? = null
    private var hasLoadedPage = false
    private var startupFailed = false
    private var textToSpeech: TextToSpeech? = null
    @Volatile private var textToSpeechReady = false
    @Volatile private var indonesianVoiceAvailable = false
    @Volatile private var trustedNakEnaPage = false
    private val rememberedLoginLock = Any()
    private val rememberedLoginPreferences by lazy {
        getSharedPreferences(REMEMBERED_LOGIN_PREFERENCES, MODE_PRIVATE)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)

        chooserLauncher = registerForActivityResult(
            ActivityResultContracts.StartActivityForResult(),
            ::onFileChooserResult,
        )
        cameraOutputUri = savedInstanceState?.getString(STATE_CAMERA_OUTPUT_URI)?.let(Uri::parse)
        initializeTextToSpeech()

        val container = FrameLayout(this)
        container.setBackgroundColor(Color.rgb(6, 13, 26))
        ViewCompat.setOnApplyWindowInsetsListener(container) { view, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            view.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            WindowInsetsCompat.CONSUMED
        }
        webView = WebView(this)
        configureWebView()
        container.addView(
            webView,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            ),
        )
        startupOverlay = createStartupOverlay()
        container.addView(
            startupOverlay,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            ),
        )
        setContentView(container)
        ViewCompat.requestApplyInsets(container)
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack()
                else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })

        if (savedInstanceState == null) {
            webView.loadUrl(START_URL)
        } else {
            hasLoadedPage = webView.restoreState(savedInstanceState) != null
            if (!hasLoadedPage) webView.loadUrl(START_URL)
            else startupOverlay.visibility = View.GONE
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        webView.setBackgroundColor(Color.rgb(6, 13, 26))
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = true
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            javaScriptCanOpenWindowsAutomatically = false
            setSupportMultipleWindows(false)
            mediaPlaybackRequiresUserGesture = true
        }
        webView.addJavascriptInterface(NakEnaTtsBridge(), "NakEnaTts")

        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView, url: String, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                trustedNakEnaPage = isNakEnaUrl(url)
            }

            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest,
            ): Boolean = handleNavigation(request.url)

            @Suppress("DEPRECATION")
            override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean =
                handleNavigation(Uri.parse(url))

            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)
                if (startupFailed && !hasLoadedPage) return
                hasLoadedPage = true
                startupOverlay.visibility = View.GONE
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError,
            ) {
                super.onReceivedError(view, request, error)
                if (request.isForMainFrame && !hasLoadedPage) {
                    startupFailed = true
                    showStartupError()
                }
            }

            override fun onReceivedSslError(
                view: WebView,
                handler: SslErrorHandler,
                error: SslError,
            ) {
                handler.cancel()
                if (!hasLoadedPage && Uri.parse(error.url).host.equals(ALLOWED_HOST, ignoreCase = true)) {
                    startupFailed = true
                    showStartupError()
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView,
                filePathCallback: ValueCallback<Array<Uri>>,
                fileChooserParams: FileChooserParams,
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback
                return try {
                    chooserLauncher.launch(createPhotoChooser())
                    true
                } catch (_: Exception) {
                    this@MainActivity.filePathCallback?.onReceiveValue(null)
                    this@MainActivity.filePathCallback = null
                    cameraOutputUri = null
                    Toast.makeText(this@MainActivity, R.string.photo_picker_unavailable, Toast.LENGTH_LONG).show()
                    true
                }
            }
        }
    }

    private fun handleNavigation(uri: Uri): Boolean {
        if (uri.scheme == "https" && uri.host.equals(ALLOWED_HOST, ignoreCase = true)) {
            return false
        }

        return try {
            startActivity(Intent(Intent.ACTION_VIEW, uri))
            true
        } catch (_: ActivityNotFoundException) {
            Toast.makeText(this, R.string.link_unavailable, Toast.LENGTH_SHORT).show()
            true
        }
    }

    private fun initializeTextToSpeech() {
        textToSpeech = TextToSpeech(this) { status ->
            if (status == TextToSpeech.SUCCESS) {
                textToSpeech?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                    override fun onStart(utteranceId: String?) = Unit

                    override fun onDone(utteranceId: String?) {
                        dispatchNativeTtsEvent("nakena-native-tts-ended")
                    }

                    @Deprecated("Deprecated in Java")
                    override fun onError(utteranceId: String?) {
                        dispatchNativeTtsEvent("nakena-native-tts-error")
                    }

                    override fun onError(utteranceId: String?, errorCode: Int) {
                        dispatchNativeTtsEvent("nakena-native-tts-error")
                    }
                })
                updateIndonesianVoiceAvailability()
            }
        }
    }

    private fun updateIndonesianVoiceAvailability() {
        val engine = textToSpeech ?: return
        val availability = engine.isLanguageAvailable(Locale("id", "ID"))
        indonesianVoiceAvailable = availability >= TextToSpeech.LANG_AVAILABLE
        textToSpeechReady = true
    }

    private fun dispatchNativeTtsEvent(eventName: String) {
        if (!this::webView.isInitialized) return
        webView.post {
            webView.evaluateJavascript(
                "window.dispatchEvent(new Event('$eventName'))",
                null,
            )
        }
    }

    private inner class NakEnaTtsBridge {
        @android.webkit.JavascriptInterface
        fun isIndonesianAvailable(): Boolean =
            textToSpeechReady && indonesianVoiceAvailable

        @android.webkit.JavascriptInterface
        fun speakIndonesian(text: String): Boolean {
            if (!isIndonesianAvailable() || text.isBlank()) return false
            runOnUiThread {
                val engine = textToSpeech ?: return@runOnUiThread
                if (engine.setLanguage(Locale("id", "ID")) < TextToSpeech.LANG_AVAILABLE) {
                    dispatchNativeTtsEvent("nakena-native-tts-error")
                    return@runOnUiThread
                }
                val result = engine.speak(
                    text.take(4000),
                    TextToSpeech.QUEUE_FLUSH,
                    null,
                    "nakena-${System.nanoTime()}",
                )
                if (result == TextToSpeech.ERROR) {
                    dispatchNativeTtsEvent("nakena-native-tts-error")
                }
            }
            return true
        }

        @android.webkit.JavascriptInterface
        fun stop() {
            runOnUiThread { textToSpeech?.stop() }
        }

        @android.webkit.JavascriptInterface
        fun installIndonesianVoiceData() {
            runOnUiThread {
                try {
                    startActivity(Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA))
                } catch (_: Exception) {
                    Toast.makeText(
                        this@MainActivity,
                        R.string.tts_install_unavailable,
                        Toast.LENGTH_LONG,
                    ).show()
                }
            }
        }

        @android.webkit.JavascriptInterface
        fun getRememberedCredentials(): String {
            if (!trustedNakEnaPage) return ""
            return synchronized(rememberedLoginLock) {
                val encrypted = rememberedLoginPreferences.getString(REMEMBERED_LOGIN_KEY, null)
                    ?: return@synchronized ""
                try {
                    decryptRememberedCredentials(encrypted)
                } catch (error: GeneralSecurityException) {
                    forgetUnreadableCredentials(error)
                } catch (error: IOException) {
                    forgetUnreadableCredentials(error)
                } catch (error: IllegalArgumentException) {
                    forgetUnreadableCredentials(error)
                }
            }
        }

        @android.webkit.JavascriptInterface
        fun saveRememberedCredentials(email: String, password: String, remember: Boolean): Boolean {
            if (!trustedNakEnaPage) return false
            return synchronized(rememberedLoginLock) {
                if (!remember) {
                    return@synchronized rememberedLoginPreferences.edit()
                        .remove(REMEMBERED_LOGIN_KEY)
                        .commit()
                }
                if (email.isBlank() || password.isEmpty()) return@synchronized false
                try {
                    val payload = JSONObject()
                        .put("email", email)
                        .put("password", password)
                        .toString()
                    rememberedLoginPreferences.edit()
                        .putString(REMEMBERED_LOGIN_KEY, encryptRememberedCredentials(payload))
                        .commit()
                } catch (error: GeneralSecurityException) {
                    Log.e(TAG, "Could not securely save remembered login", error)
                    false
                } catch (error: IOException) {
                    Log.e(TAG, "Could not securely save remembered login", error)
                    false
                } catch (error: JSONException) {
                    Log.e(TAG, "Could not encode remembered login", error)
                    false
                }
            }
        }
    }

    private fun isNakEnaUrl(url: String): Boolean {
        val uri = Uri.parse(url)
        return uri.scheme == "https" && uri.host.equals(ALLOWED_HOST, ignoreCase = true)
    }

    @Throws(GeneralSecurityException::class, IOException::class)
    private fun rememberedLoginKey(): SecretKey {
        val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (keyStore.getKey(REMEMBERED_LOGIN_KEY_ALIAS, null) as? SecretKey)?.let { return it }

        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        generator.init(
            KeyGenParameterSpec.Builder(
                REMEMBERED_LOGIN_KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build(),
        )
        return generator.generateKey()
    }

    @Throws(GeneralSecurityException::class, IOException::class)
    private fun encryptRememberedCredentials(value: String): String {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, rememberedLoginKey())
        val iv = Base64.encodeToString(cipher.iv, Base64.NO_WRAP)
        val encrypted = Base64.encodeToString(cipher.doFinal(value.toByteArray(Charsets.UTF_8)), Base64.NO_WRAP)
        return "$iv:$encrypted"
    }

    @Throws(GeneralSecurityException::class, IOException::class)
    private fun decryptRememberedCredentials(value: String): String {
        val parts = value.split(':', limit = 2)
        require(parts.size == 2) { "Malformed remembered login" }
        val iv = Base64.decode(parts[0], Base64.NO_WRAP)
        val encrypted = Base64.decode(parts[1], Base64.NO_WRAP)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, rememberedLoginKey(), GCMParameterSpec(128, iv))
        return String(cipher.doFinal(encrypted), Charsets.UTF_8)
    }

    private fun forgetUnreadableCredentials(error: Exception): String {
        Log.e(TAG, "Could not read remembered login", error)
        rememberedLoginPreferences.edit().remove(REMEMBERED_LOGIN_KEY).commit()
        return """{"error":"remembered_credentials_unavailable"}"""
    }

    private fun createPhotoChooser(): Intent {
        val photoDirectory = File(cacheDir, "camera").apply { mkdirs() }
        val photoFile = File.createTempFile("nakena-photo-", ".jpg", photoDirectory)
        val outputUri = FileProvider.getUriForFile(
            this,
            "$packageName.fileprovider",
            photoFile,
        )
        cameraOutputUri = outputUri

        val cameraIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
            putExtra(MediaStore.EXTRA_OUTPUT, outputUri)
            clipData = ClipData.newUri(contentResolver, "NakEna photo", outputUri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
        }
        val galleryIntent = Intent(Intent.ACTION_GET_CONTENT).apply {
            type = "image/*"
            addCategory(Intent.CATEGORY_OPENABLE)
            putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false)
        }

        return Intent.createChooser(galleryIntent, getString(R.string.choose_photo)).apply {
            if (cameraIntent.resolveActivity(packageManager) != null) {
                putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf(cameraIntent))
            }
        }
    }

    private fun onFileChooserResult(result: ActivityResult) {
        val callback = filePathCallback ?: return
        val selectedUris = if (result.resultCode == Activity.RESULT_OK) {
            val data = result.data
            val clipData = data?.clipData
            when {
                clipData != null -> Array(clipData.itemCount) { index -> clipData.getItemAt(index).uri }
                data?.data != null -> arrayOf(data.data!!)
                cameraOutputUri != null -> arrayOf(cameraOutputUri!!)
                else -> null
            }
        } else {
            null
        }
        callback.onReceiveValue(selectedUris)
        filePathCallback = null
        cameraOutputUri = null
    }

    private fun createStartupOverlay(): LinearLayout {
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(dp(28), dp(28), dp(28), dp(28))
            setBackgroundColor(Color.rgb(6, 13, 26))
        }
        val logo = ImageView(this).apply {
            setImageResource(R.drawable.nakena_mark)
            background = GradientDrawable().apply {
                setColor(Color.rgb(255, 122, 14))
                cornerRadius = dp(20).toFloat()
            }
            setPadding(dp(16), dp(16), dp(16), dp(16))
            contentDescription = getString(R.string.app_name)
        }
        content.addView(logo, LinearLayout.LayoutParams(dp(72), dp(72)))

        content.addView(TextView(this).apply {
            text = getString(R.string.app_name)
            setTextColor(Color.WHITE)
            textSize = 28f
            typeface = Typeface.create("sans-serif", Typeface.BOLD)
            gravity = Gravity.CENTER
        }, LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
            topMargin = dp(16)
        })

        loadingIndicator = ProgressBar(this).apply {
            isIndeterminate = true
            indeterminateTintList = android.content.res.ColorStateList.valueOf(Color.rgb(255, 153, 66))
        }
        content.addView(loadingIndicator, LinearLayout.LayoutParams(dp(32), dp(32)).apply {
            topMargin = dp(24)
        })

        startupMessage = TextView(this).apply {
            text = getString(R.string.loading_nakena)
            setTextColor(Color.rgb(181, 196, 220))
            textSize = 14f
            gravity = Gravity.CENTER
        }
        content.addView(startupMessage, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
        ).apply {
            topMargin = dp(18)
        })

        retryButton = Button(this).apply {
            text = getString(R.string.retry)
            visibility = View.GONE
            setTextColor(Color.WHITE)
            backgroundTintList = android.content.res.ColorStateList.valueOf(Color.rgb(255, 122, 14))
            setOnClickListener {
                startupMessage.text = getString(R.string.loading_nakena)
                loadingIndicator.visibility = View.VISIBLE
                retryButton.visibility = View.GONE
                startupFailed = false
                webView.loadUrl(START_URL)
            }
        }
        content.addView(retryButton, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
        ).apply {
            topMargin = dp(8)
        })
        return content
    }

    private fun showStartupError() {
        runOnUiThread {
            startupOverlay.visibility = View.VISIBLE
            loadingIndicator.visibility = View.GONE
            startupMessage.text = getString(R.string.connection_error)
            retryButton.visibility = View.VISIBLE
        }
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        cameraOutputUri?.let { outState.putString(STATE_CAMERA_OUTPUT_URI, it.toString()) }
        super.onSaveInstanceState(outState)
    }

    override fun onResume() {
        super.onResume()
        if (this::webView.isInitialized) webView.onResume()
        if (textToSpeechReady) updateIndonesianVoiceAvailability()
    }

    override fun onPause() {
        if (this::webView.isInitialized) webView.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        filePathCallback?.onReceiveValue(null)
        filePathCallback = null
        textToSpeech?.stop()
        textToSpeech?.shutdown()
        textToSpeech = null
        if (this::webView.isInitialized) {
            webView.stopLoading()
            webView.destroy()
        }
        super.onDestroy()
    }

    companion object {
        private const val TAG = "NakEna"
        private const val ALLOWED_HOST = "nakena.iet-polinela.my.id"
        private const val START_URL = "https://nakena.iet-polinela.my.id/login/?app_start=1"
        private const val STATE_CAMERA_OUTPUT_URI = "camera_output_uri"
        private const val REMEMBERED_LOGIN_PREFERENCES = "remembered_login"
        private const val REMEMBERED_LOGIN_KEY = "credentials"
        private const val REMEMBERED_LOGIN_KEY_ALIAS = "nakena_remembered_login_key"
    }
}
