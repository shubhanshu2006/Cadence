package com.cadence.web;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import android.content.ComponentName;
import androidx.core.content.ContextCompat;
import androidx.media3.session.MediaController;
import androidx.media3.session.SessionToken;
import com.google.common.util.concurrent.ListenableFuture;

public class MainActivity extends BridgeActivity {
    private static final int NOTIFICATION_PERMISSION_REQUEST_CODE = 1002;
    private static final String TAG = "CadenceMainActivity";
    private static MainActivity instance;
    private ListenableFuture<MediaController> controllerFuture;
    private volatile MediaController mediaController;

    public static MainActivity getInstance() {
        return instance;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        instance = this;

        requestNotificationPermission();
        SessionToken sessionToken = new SessionToken(
                this,
                new ComponentName(this, CadenceMediaService.class)
        );
        controllerFuture = new MediaController.Builder(this, sessionToken).buildAsync();
        controllerFuture.addListener(() -> {
            try {
                mediaController = controllerFuture.get();
            } catch (Exception exception) {
                Log.e(TAG, "Unable to connect to native media session", exception);
            }
        }, ContextCompat.getMainExecutor(this));

        if (getBridge() != null && getBridge().getWebView() != null) {
            WebSettings settings = getBridge().getWebView().getSettings();
            // Allow continuous background audio playback without requiring gesture per track
            settings.setMediaPlaybackRequiresUserGesture(false);

            // Register native bridge for notification player
            getBridge().getWebView().addJavascriptInterface(new AndroidMediaBridge(), "AndroidMediaBridge");
        }
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && checkSelfPermission("android.permission.POST_NOTIFICATIONS")
                != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(
                    new String[]{"android.permission.POST_NOTIFICATIONS"},
                    NOTIFICATION_PERMISSION_REQUEST_CODE
            );
        }
    }

    public class AndroidMediaBridge {
        @JavascriptInterface
        public void playTrack(String videoId, String title, String artist, String artworkUrl,
                          String backendUrl, String queueJson, int startIndex, boolean isPlaying) {
            Intent intent = new Intent(MainActivity.this, CadenceMediaService.class);
            intent.setAction(CadenceMediaService.ACTION_PLAY_TRACK);
            intent.putExtra(CadenceMediaService.EXTRA_VIDEO_ID, videoId);
            intent.putExtra(CadenceMediaService.EXTRA_TITLE, title);
            intent.putExtra(CadenceMediaService.EXTRA_ARTIST, artist);
            intent.putExtra(CadenceMediaService.EXTRA_ARTWORK_URL, artworkUrl);
            intent.putExtra(CadenceMediaService.EXTRA_BACKEND_URL, backendUrl);
            intent.putExtra(CadenceMediaService.EXTRA_QUEUE_JSON, queueJson);
            intent.putExtra(CadenceMediaService.EXTRA_START_INDEX, startIndex);
            intent.putExtra(CadenceMediaService.EXTRA_IS_PLAYING, isPlaying);

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(intent);
                } else {
                    startService(intent);
                }
            } catch (Exception exception) {
                Log.e(TAG, "Unable to start media playback service", exception);
            }
        }

        @JavascriptInterface
        public void control(String action) {
            if (CadenceMediaService.dispatchControl(action)) {
                return;
            }

            MediaController controller = mediaController;
            if (controller != null && controller.isConnected()) {
                if (CadenceMediaService.ACTION_PLAY.equals(action)) {
                    controller.play();
                } else if (CadenceMediaService.ACTION_PAUSE.equals(action)) {
                    controller.pause();
                } else if (CadenceMediaService.ACTION_NEXT.equals(action)) {
                    controller.seekToNextMediaItem();
                } else if (CadenceMediaService.ACTION_PREV.equals(action)) {
                    controller.seekToPreviousMediaItem();
                } else if (CadenceMediaService.ACTION_STOP.equals(action)) {
                    controller.stop();
                }
                return;
            }
            Intent intent = new Intent(MainActivity.this, CadenceMediaService.class);
            intent.setAction(action);
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startService(intent);
                } else {
                    startService(intent);
                }
            } catch (Exception exception) {
                Log.e(TAG, "Unable to control media playback service", exception);
            }
        }

        @JavascriptInterface
        public void seekTo(double positionSeconds) {
            if (CadenceMediaService.dispatchSeek(
                    Math.max(0L, (long) (positionSeconds * 1000))
            )) {
                return;
            }

            MediaController controller = mediaController;
            if (controller != null && controller.isConnected()) {
                controller.seekTo(Math.max(0L, (long) (positionSeconds * 1000)));
                return;
            }
            Intent intent = new Intent(MainActivity.this, CadenceMediaService.class);
            intent.setAction(CadenceMediaService.ACTION_SEEK);
            intent.putExtra(
                    CadenceMediaService.EXTRA_POSITION_MS,
                    Math.max(0L, (long) (positionSeconds * 1000))
            );
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startService(intent);
                } else {
                    startService(intent);
                }
            } catch (Exception exception) {
                Log.e(TAG, "Unable to seek native media playback", exception);
            }
        }

        @JavascriptInterface
        public void addToQueue(String videoId, String title, String artist, String artworkUrl) {
            CadenceMediaService.dispatchAddToQueue(videoId, title, artist, artworkUrl);
        }

        @JavascriptInterface
        public boolean playQueuedTrack(String videoId) {
            return CadenceMediaService.dispatchPlayQueuedTrack(videoId);
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

    public void handleNativeProgress(long positionMs, long durationMs, boolean isPlaying) {
        runOnUiThread(() -> {
            if (getBridge() != null && getBridge().getWebView() != null) {
                String script = "window.CadenceNativeProgress && window.CadenceNativeProgress("
                        + positionMs + "," + durationMs + "," + isPlaying + ")";
                getBridge().getWebView().evaluateJavascript(script, null);
            }
        });
    }

    public void handleNativeTrack(String videoId) {
        runOnUiThread(() -> {
            if (getBridge() != null && getBridge().getWebView() != null) {
                String escapedId = videoId.replace("\\", "\\\\").replace("'", "\\'");
                getBridge().getWebView().evaluateJavascript(
                        "window.CadenceNativeTrack && window.CadenceNativeTrack('" + escapedId + "')",
                        null
                );
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
    public void onResume() {
        super.onResume();
        CadenceMediaService.syncProgress();
    }

    @Override
    public void onDestroy() {
        if (controllerFuture != null) {
            MediaController.releaseFuture(controllerFuture);
            controllerFuture = null;
            mediaController = null;
        }
        if (instance == this) {
            instance = null;
        }
        super.onDestroy();
    }
}
