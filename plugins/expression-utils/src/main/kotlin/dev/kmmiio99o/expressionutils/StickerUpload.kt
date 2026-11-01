package dev.kmmiio99o.expressionutils

import android.app.Activity
import android.net.Uri
import java.io.File

internal data class StagedStickerImage(
	val uri: Uri,
	val fileName: String,
	val mimeType: String,
	val bytes: Int,
)

internal fun stageStickerImageForUpload(
	activity: Activity,
	url: String,
	requestedName: String,
): StagedStickerImage {
	val image = fetchImage(url)
	require(image.mimeType in SUPPORTED_STICKER_IMAGE_TYPES) {
		"Only PNG, APNG, and GIF stickers can be cloned"
	}
	val fileName = canonicalImageName(requestedName, image.mimeType)
	val extension = fileName.substringAfterLast('.')
	val file = File.createTempFile("expression-utils-", ".$extension", activity.cacheDir)
	try {
		file.outputStream().use { it.write(image.bytes) }
		return StagedStickerImage(
			uri = Uri.fromFile(file),
			fileName = fileName,
			mimeType = image.mimeType,
			bytes = image.bytes.size,
		)
	} catch (error: Throwable) {
		file.delete()
		throw error
	}
}

internal fun deleteStagedStickerImage(activity: Activity, uriValue: String): Boolean {
	val uri = Uri.parse(uriValue)
	require(uri.scheme == "file") { "Invalid staged sticker image URI" }
	val cachePath = activity.cacheDir.canonicalPath
	val file = File(checkNotNull(uri.path) { "Invalid staged sticker image path" })
	val filePath = file.canonicalPath
	require(filePath.startsWith("$cachePath${File.separator}")) {
		"Staged sticker image is outside the plugin cache"
	}
	return file.delete() || !file.exists()
}

private val SUPPORTED_STICKER_IMAGE_TYPES = setOf(
	"image/png",
	"image/apng",
	"image/gif",
)
