# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# --- Knexura Flow ---
# Capacitor finds plugins and their @PluginMethod members by reflection.
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * { @com.getcapacitor.PluginMethod public <methods>; }
-keep class online.knexura.moneymanager.** { *; }
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod, SourceFile, LineNumberTable
-renamesourcefileattribute SourceFile

# ONNX Runtime calls back into its classes from native code (JNI).
-keep class ai.onnxruntime.** { *; }
-dontwarn ai.onnxruntime.**

# cordova-plugin-purchase (in-app billing) and the Cordova bridge it runs on.
-keep class cc.fovea.** { *; }
-keep class org.apache.cordova.** { *; }

# Methods exposed to the web view.
-keepclassmembers class * { @android.webkit.JavascriptInterface <methods>; }
