package com.cadence.web;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static MainActivity instance;

    public static MainActivity getInstance() {
        return instance;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        instance = this;

        if (getBridge() != null && getBridge().getWebView() != null) {
            WebSettings settings = getBridge().getWebView().getSettings();
            // Allow continuous background audio playback without requiring gesture per track
            settings.setMediaPlaybackRequiresUserGesture(false);

            // Register native bridge for notification player
            getBridge().getWebView().addJavascriptInterface(new AndroidMediaBridge(), "AndroidMediaBridge");
        }
    }

    public class AndroidMediaBridge {
        @JavascriptInterface
        public void updateTrack(String title, String artist, String artworkUrl, boolean isPlaying) {
            Intent intent = new Intent(MainActivity.this, CadenceMediaService.class);
            intent.setAction(CadenceMediaService.ACTION_UPDATE);
            intent.putExtra(CadenceMediaService.EXTRA_TITLE, title);
            intent.putExtra(CadenceMediaService.EXTRA_ARTIST, artist);
            intent.putExtra(CadenceMediaService.EXTRA_ARTWORK_URL, artworkUrl);
            intent.putExtra(CadenceMediaService.EXTRA_IS_PLAYING, isPlaying);

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(intent);
                } else {
                    startService(intent);
                }
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void stopNotification() {
            Intent intent = new Intent(MainActivity.this, CadenceMediaService.class);
            intent.setAction(CadenceMediaService.ACTION_STOP);
            try {
                startService(intent);
            } catch (Exception ignored) {}
        }
    }

    public void handleMediaControl(String action) {
        runOnUiThread(() -> {
            if (getBridge() != null && getBridge().getWebView() != null) {
                if (CadenceMediaService.ACTION_PLAY.equals(action)) {
                    getBridge().getWebView().evaluateJavascript("window.CadenceRemoteControl && window.CadenceRemoteControl.play()", null);
                } else if (CadenceMediaService.ACTION_PAUSE.equals(action)) {
                    getBridge().getWebView().evaluateJavascript("window.CadenceRemoteControl && window.CadenceRemoteControl.pause()", null);
                } else if (CadenceMediaService.ACTION_NEXT.equals(action)) {
                    getBridge().getWebView().evaluateJavascript("window.CadenceRemoteControl && window.CadenceRemoteControl.next()", null);
                } else if (CadenceMediaService.ACTION_PREV.equals(action)) {
                    getBridge().getWebView().evaluateJavascript("window.CadenceRemoteControl && window.CadenceRemoteControl.prev()", null);
                }
            }
        });
    }

    @Override
    public void onBackPressed() {
        // Spotify behavior: keep music playing in background instead of destroying Activity
        moveTaskToBack(true);
    }

    @Override
    public void onPause() {
        super.onPause();
        // Prevent Android WebView from freezing background audio playback when minimized
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().resumeTimers();
        }
    }

    @Override
    public void onDestroy() {
        if (instance == this) {
            instance = null;
        }
        super.onDestroy();
    }
}
