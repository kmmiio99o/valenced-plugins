package dev.kmmiio99o.expressionutils

import android.app.Activity
import android.content.ContentValues
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import java.io.File

internal fun saveImageToDownloads(
	activity: Activity,
	requestedName: String,
	image: ImagePayload,
): Uri {
	val fileName = canonicalImageName(requestedName, image.mimeType)
	if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
		return saveLegacyDownload(fileName, image.bytes)
	}

	val values = ContentValues().apply {
		put(MediaStore.Downloads.DISPLAY_NAME, fileName)
		put(MediaStore.Downloads.MIME_TYPE, image.mimeType)
		put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
		put(MediaStore.Downloads.IS_PENDING, 1)
	}
	val resolver = activity.contentResolver
	val uri = checkNotNull(
		resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values),
	) { "Unable to create the download file" }
	try {
		checkNotNull(resolver.openOutputStream(uri, "w")) {
			"Unable to write the download file"
		}.use { it.write(image.bytes) }
		check(resolver.update(uri, publishedDownloadValues(), null, null) > 0) {
			"Unable to publish the downloaded image"
		}
		return uri
	} catch (error: Throwable) {
		resolver.delete(uri, null, null)
		throw error
	}
}

private fun saveLegacyDownload(fileName: String, bytes: ByteArray): Uri {
	val directory = Environment.getExternalStoragePublicDirectory(
		Environment.DIRECTORY_DOWNLOADS,
	)
	check(directory.isDirectory || directory.mkdirs()) {
		"Unable to create the Downloads directory"
	}
	val file = File(directory, fileName)
	try {
		file.outputStream().use { it.write(bytes) }
		return Uri.fromFile(file)
	} catch (error: Throwable) {
		file.delete()
		throw error
	}
}

private fun publishedDownloadValues() = ContentValues().apply {
	put(MediaStore.Downloads.IS_PENDING, 0)
}
