@file:JvmName("MaterialYouExpressive")

package dev.kmmiio99o.expressive

import app.valenced.bridge.asDelegate
import app.valenced.plugins.plugin
import app.valenced.xposed.api.registerNativeAsyncMethod
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Suppress("UNUSED")
val materialYouExpressive = plugin {
    var avatars: AvatarShapes? = null

    start {
        avatars = AvatarShapes(dexFinder, initiallyEnabled = true)

        registerNativeAsyncMethod("dev.kmmiio99o.expressive.setAvatarShapes") { args ->
            val enabled by args.asDelegate().boolean()
            withContext(Dispatchers.Main) { avatars?.setEnabled(enabled) }
            null
        }
    }

    stop {
        avatars?.dispose()
        avatars = null
    }
}
