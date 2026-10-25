package com.cadence.web;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class CadenceMediaService extends Service {
    public static final String CHANNEL_ID = "cadence_media_playback";
    public static final int NOTIFICATION_ID = 1001;

    public static final String ACTION_UPDATE = "com.cadence.web.ACTION_UPDATE";
    public static final String ACTION_STOP = "com.cadence.web.ACTION_STOP";
    public static final String ACTION_PLAY = "com.cadence.web.ACTION_PLAY";
    public static final String ACTION_PAUSE = "com.cadence.web.ACTION_PAUSE";
    public static final String ACTION_PREV = "com.cadence.web.ACTION_PREV";
    public static final String ACTION_NEXT = "com.cadence.web.ACTION_NEXT";

    public static final String EXTRA_TITLE = "extra_title";
    public static final String EXTRA_ARTIST = "extra_artist";
    public static final String EXTRA_ARTWORK_URL = "extra_artwork_url";
    public static final String EXTRA_IS_PLAYING = "extra_is_playing";

    private MediaSession mediaSession;
    private PowerManager.WakeLock wakeLock;
    private Bitmap cachedArtwork = null;
    private String lastArtworkUrl = "";

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();

        mediaSession = new MediaSession(this, "CadenceMediaSession");
        mediaSession.setActive(true);
        mediaSession.setCallback(new MediaSession.Callback() {
            @Override
            public void onPlay() {
                sendControlAction(ACTION_PLAY);
            }

            @Override
            public void onPause() {
                sendControlAction(ACTION_PAUSE);
            }

            @Override
            public void onSkipToNext() {
                sendControlAction(ACTION_NEXT);
            }

            @Override
            public void onSkipToPrevious() {
                sendControlAction(ACTION_PREV);
            }
        });

        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Cadence::MediaWakeLock");
            wakeLock.setReferenceCounted(false);
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Cadence Music Playback",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Background music playback notification and controls");
            channel.setShowBadge(false);
            channel.setSound(null, null);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;

        String action = intent.getAction();
        if (ACTION_STOP.equals(action)) {
            stopPlaybackService();
            return START_NOT_STICKY;
        } else if (ACTION_PLAY.equals(action)) {
            sendControlAction(ACTION_PLAY);
        } else if (ACTION_PAUSE.equals(action)) {
            sendControlAction(ACTION_PAUSE);
        } else if (ACTION_PREV.equals(action)) {
            sendControlAction(ACTION_PREV);
        } else if (ACTION_NEXT.equals(action)) {
            sendControlAction(ACTION_NEXT);
        } else if (ACTION_UPDATE.equals(action)) {
            String title = intent.getStringExtra(EXTRA_TITLE);
            String artist = intent.getStringExtra(EXTRA_ARTIST);
            String artworkUrl = intent.getStringExtra(EXTRA_ARTWORK_URL);
            boolean isPlaying = intent.getBooleanExtra(EXTRA_IS_PLAYING, true);

            updateMediaNotification(title, artist, artworkUrl, isPlaying);
        }

        return START_STICKY;
    }

    private void sendControlAction(String action) {
        MainActivity activity = MainActivity.getInstance();
        if (activity != null) {
            activity.handleMediaControl(action);
        }
    }

    private void updateMediaNotification(String title, String artist, String artworkUrl, boolean isPlaying) {
        if (title == null || title.isEmpty()) title = "Cadence Music";
        if (artist == null || artist.isEmpty()) artist = "Playing";

        if (isPlaying && wakeLock != null && !wakeLock.isHeld()) {
            try {
                wakeLock.acquire(180 * 60 * 1000L); // 3 hours timeout safety
            } catch (Exception ignored) {}
        } else if (!isPlaying && wakeLock != null && wakeLock.isHeld()) {
            try {
                wakeLock.release();
            } catch (Exception ignored) {}
        }

        // Update MediaSession state
        PlaybackState.Builder stateBuilder = new PlaybackState.Builder()
                .setActions(PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE |
                        PlaybackState.ACTION_SKIP_TO_NEXT | PlaybackState.ACTION_SKIP_TO_PREVIOUS |
                        PlaybackState.ACTION_PLAY_PAUSE)
                .setState(isPlaying ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED,
                        PlaybackState.PLAYBACK_POSITION_UNKNOWN, 1.0f);
        mediaSession.setPlaybackState(stateBuilder.build());

        MediaMetadata.Builder metadataBuilder = new MediaMetadata.Builder()
                .putString(MediaMetadata.METADATA_KEY_TITLE, title)
                .putString(MediaMetadata.METADATA_KEY_ARTIST, artist)
                .putString(MediaMetadata.METADATA_KEY_ALBUM, "Cadence Music");

        if (cachedArtwork != null && artworkUrl != null && artworkUrl.equals(lastArtworkUrl)) {
            metadataBuilder.putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, cachedArtwork);
        }
        mediaSession.setMetadata(metadataBuilder.build());

        // Build native notification
        Notification notification = buildNotification(title, artist, isPlaying, cachedArtwork);
        startForeground(NOTIFICATION_ID, notification);

        // Fetch artwork in background if changed
        if (artworkUrl != null && !artworkUrl.isEmpty() && !artworkUrl.equals(lastArtworkUrl)) {
            lastArtworkUrl = artworkUrl;
            final String finalTitle = title;
            final String finalArtist = artist;
            final boolean finalIsPlaying = isPlaying;

            new Thread(() -> {
                try {
                    URL url = new URL(artworkUrl);
                    HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                    connection.setDoInput(true);
                    connection.setConnectTimeout(5000);
                    connection.setReadTimeout(5000);
                    connection.connect();
                    InputStream input = connection.getInputStream();
                    Bitmap bitmap = BitmapFactory.decodeStream(input);
                    if (bitmap != null) {
                        cachedArtwork = bitmap;
                        Notification updatedNotification = buildNotification(finalTitle, finalArtist, finalIsPlaying, bitmap);
                        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                        if (manager != null) {
                            manager.notify(NOTIFICATION_ID, updatedNotification);
                        }
                    }
                } catch (Exception ignored) {}
            }).start();
        }
    }

    private Notification buildNotification(String title, String artist, boolean isPlaying, Bitmap artwork) {
        Intent launchIntent = new Intent(this, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(
                this, 0, launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        PendingIntent prevIntent = createServicePendingIntent(ACTION_PREV, 1);
        PendingIntent playPauseIntent = createServicePendingIntent(isPlaying ? ACTION_PAUSE : ACTION_PLAY, 2);
        PendingIntent nextIntent = createServicePendingIntent(ACTION_NEXT, 3);

        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }

        builder.setContentTitle(title)
                .setContentText(artist)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentIntent(contentIntent)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setOngoing(isPlaying);

        if (artwork != null) {
            builder.setLargeIcon(artwork);
        }

        // Add Playback Control Actions
        builder.addAction(R.drawable.ic_skip_previous, "Previous", prevIntent);
        if (isPlaying) {
            builder.addAction(R.drawable.ic_pause, "Pause", playPauseIntent);
        } else {
            builder.addAction(R.drawable.ic_play_arrow, "Play", playPauseIntent);
        }
        builder.addAction(R.drawable.ic_skip_next, "Next", nextIntent);

        // Apply Android Native MediaStyle for Quick Settings Shade
        Notification.MediaStyle mediaStyle = new Notification.MediaStyle()
                .setMediaSession(mediaSession.getSessionToken())
                .setShowActionsInCompactView(0, 1, 2);

        builder.setStyle(mediaStyle);
        return builder.build();
    }

    private PendingIntent createServicePendingIntent(String action, int requestCode) {
        Intent intent = new Intent(this, CadenceMediaService.class);
        intent.setAction(action);
        return PendingIntent.getService(
                this, requestCode, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );
    }

    private void stopPlaybackService() {
        if (wakeLock != null && wakeLock.isHeld()) {
            try {
                wakeLock.release();
            } catch (Exception ignored) {}
        }
        if (mediaSession != null) {
            mediaSession.setActive(false);
        }
        stopForeground(true);
        stopSelf();
    }

    @Override
    public void onDestroy() {
        stopPlaybackService();
        if (mediaSession != null) {
            mediaSession.release();
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
