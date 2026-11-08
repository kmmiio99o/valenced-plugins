package dev.kmmiio99o.expressive

import android.graphics.Canvas
import android.graphics.Outline
import android.graphics.Path
import android.os.Build
import android.view.View
import android.view.ViewGroup
import android.view.ViewOutlineProvider
import app.valenced.xposed.api.DexFinder
import de.robv.android.xposed.XC_MethodHook
import de.robv.android.xposed.XposedBridge
import java.util.WeakHashMap
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

private const val MESSAGE_VIEW = "com.discord.chat.presentation.message.MessageView"
private const val DRAW_SAVE_COUNT = "dev.kmmiio99o.expressive.avatar.drawSaveCount"
private const val LOBES = 9
private const val DEPTH = 0.20f
private const val AVATAR_SCALE = 1.12f
private const val STEPS = 180

internal class AvatarShapes(
    dexFinder: DexFinder,
    initiallyEnabled: Boolean,
) {
    private val avatarStates = WeakHashMap<View, AvatarState>()
    private val unhooks = mutableListOf<XC_MethodHook.Unhook>()
    private var drawUnhook: XC_MethodHook.Unhook? = null
    @Volatile
    private var enabled = initiallyEnabled
    @Volatile
    private var avatarViewId = 0

    init {
        val setMessage = dexFinder.findMethod {
            matcher {
                declaredClass(MESSAGE_VIEW)
                usingEqStrings("message", "messageContext", "eventHandler")
            }
        } ?: error("MessageView.setMessage not found")

        unhooks += XposedBridge.hookMethod(setMessage, object : XC_MethodHook() {
            override fun afterHookedMethod(param: MethodHookParam) {
                if (!enabled) return
                val message = param.thisObject as ViewGroup
                val id = message.idOf("author_avatar")
                if (id == 0) return

                val avatar = (0 until message.childCount)
                    .map(message::getChildAt)
                    .firstOrNull { it.id == id } ?: return
                avatarViewId = id
                synchronized(avatarStates) {
                    val state = avatarStates.getOrPut(avatar) {
                        AvatarState(
                            avatar.scaleX,
                            avatar.scaleY,
                            avatar.outlineProvider,
                            avatar.clipToOutline,
                        )
                    }
                    applyShape(avatar)
                }
            }
        })

        if (enabled && Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            installDrawHook()
        }
    }

    fun setEnabled(value: Boolean) {
        if (enabled == value) return
        enabled = value
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            if (value) installDrawHook() else removeDrawHook()
        }
        synchronized(avatarStates) {
            avatarStates.forEach { (view, state) ->
                if (value) applyShape(view) else restoreShape(view, state)
            }
        }
    }

    fun dispose() {
        removeDrawHook()
        for (unhook in unhooks) unhook.unhook()
        unhooks.clear()
        synchronized(avatarStates) {
            avatarStates.forEach { (view, state) -> restoreShape(view, state) }
            avatarStates.clear()
        }
    }

    private fun installDrawHook() {
        if (drawUnhook != null) return
        val draw = View::class.java.getDeclaredMethod("draw", Canvas::class.java)
        drawUnhook = XposedBridge.hookMethod(draw, object : XC_MethodHook() {
            override fun beforeHookedMethod(param: MethodHookParam) {
                if (!enabled) return
                val view = param.thisObject as View
                if (view.id != avatarViewId) return
                val state = synchronized(avatarStates) { avatarStates[view] } ?: return
                if (view.width == 0 || view.height == 0) return

                val canvas = param.args[0] as Canvas
                val saveCount = canvas.save()
                canvas.clipPath(state.clipPath.path(view.width, view.height))
                param.setObjectExtra(DRAW_SAVE_COUNT, saveCount)
            }

            override fun afterHookedMethod(param: MethodHookParam) {
                val saveCount = param.getObjectExtra(DRAW_SAVE_COUNT) as? Int ?: return
                (param.args[0] as Canvas).restoreToCount(saveCount)
            }
        })
    }

    private fun removeDrawHook() {
        drawUnhook?.unhook()
        drawUnhook = null
    }

    private fun applyShape(view: View) {
        view.scaleX = AVATAR_SCALE
        view.scaleY = AVATAR_SCALE
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            view.outlineProvider = Cookie
            view.clipToOutline = true
        }
        view.invalidate()
    }

    private fun restoreShape(view: View, state: AvatarState) {
        view.scaleX = state.scaleX
        view.scaleY = state.scaleY
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && view.outlineProvider === Cookie
        ) {
            view.outlineProvider = state.outlineProvider
            view.clipToOutline = state.clipToOutline
        }
        view.invalidate()
    }

    private data class AvatarState(
        val scaleX: Float,
        val scaleY: Float,
        val outlineProvider: ViewOutlineProvider?,
        val clipToOutline: Boolean,
        val clipPath: ClipPath = ClipPath(),
    )

    private class ClipPath {
        private var width = 0
        private var height = 0
        private var cachedPath = Path()

        fun path(width: Int, height: Int): Path {
            if (this.width != width || this.height != height) {
                this.width = width
                this.height = height
                cachedPath = createPath(width.toFloat(), height.toFloat())
            }
            return cachedPath
        }
    }

    private object Cookie : ViewOutlineProvider() {
        override fun getOutline(view: View, outline: Outline) {
            if (view.width == 0 || view.height == 0) return
            outline.setPath(createPath(view.width.toFloat(), view.height.toFloat()))
        }
    }

    companion object {
        private fun createPath(width: Float, height: Float) = Path().apply {
            for (i in 0..STEPS) {
                val angle = i.toFloat() / STEPS * 2 * PI.toFloat()
                val radius = 0.5f * (1 - DEPTH + DEPTH * (0.5f + 0.5f * cos(LOBES * angle)))
                val x = width * (0.5f + radius * cos(angle - PI.toFloat() / 2))
                val y = height * (0.5f + radius * sin(angle - PI.toFloat() / 2))
                if (i == 0) moveTo(x, y) else lineTo(x, y)
            }
            close()
        }
    }
}

@Suppress("DiscouragedApi")
internal fun View.idOf(name: String) = resources.getIdentifier(name, "id", context.packageName)
