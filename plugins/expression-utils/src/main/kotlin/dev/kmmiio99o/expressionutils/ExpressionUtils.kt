@file:JvmName("ExpressionUtils")

package dev.kmmiio99o.expressionutils

import app.valenced.bridge.asDelegate
import app.valenced.plugins.PluginScope
import app.valenced.plugins.plugin
import app.valenced.xposed.api.registerNativeAsyncMethod
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlin.coroutines.resume

@Suppress("UNUSED")
val expressionUtils = plugin {
	val storagePermission = LegacyStoragePermission()

	start {
		storagePermission.install()

		registerNativeAsyncMethod("${manifest.id}.supportsImageClipboard") {
			supportsImageClipboard(awaitAppActivity())
		}

		registerNativeAsyncMethod("${manifest.id}.copyImage") { args ->
			val (url, fileName) = args.toImageArgs()
			val activity = awaitAppActivity()
			storagePermission.ensureGranted(activity)
			val image = copyImageToClipboard(activity, url, fileName)
			mapOf("uri" to image.uri.toString(), "bytes" to image.bytes)
		}

		registerNativeAsyncMethod("${manifest.id}.downloadImage") { args ->
			val (url, fileName) = args.toImageArgs()
			val activity = awaitAppActivity()
			storagePermission.ensureGranted(activity)
			val image = withContext(Dispatchers.IO) {
				downloadImageToDownloads(activity, url, fileName)
			}
			mapOf("uri" to image.uri.toString(), "bytes" to image.bytes)
		}

		registerNativeAsyncMethod("${manifest.id}.stageStickerImage") { args ->
			val (url, fileName) = args.toImageArgs()
			val activity = awaitAppActivity()
			val image = withContext(Dispatchers.IO) {
				stageStickerImageForUpload(activity, url, fileName)
			}
			mapOf(
				"uri" to image.uri.toString(),
				"fileName" to image.fileName,
				"mimeType" to image.mimeType,
				"bytes" to image.bytes,
			)
		}

		registerNativeAsyncMethod("${manifest.id}.deleteStagedStickerImage") { args ->
			val argv = args.asDelegate()
			val uri by argv.string()
			deleteStagedStickerImage(awaitAppActivity(), uri)
		}
	}

	stop {
		storagePermission.uninstall()
	}
}

private fun List<Any?>.toImageArgs(): Pair<String, String> {
	val args = asDelegate()
	val source by args.string()
	val fileName by args.string()
	require(source.startsWith("https://", ignoreCase = true)) {
		"Only HTTPS image URLs are supported"
	}
	require(fileName.matches(Regex("[A-Za-z0-9._-]{1,128}"))) {
		"Invalid image file name"
	}
	return source to fileName
}

private suspend fun PluginScope.awaitAppActivity() =
	suspendCancellableCoroutine { continuation ->
		withAppActivity { activity ->
			if (continuation.isActive) continuation.resume(activity)
		}
	}
