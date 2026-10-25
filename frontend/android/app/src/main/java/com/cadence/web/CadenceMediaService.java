package com.cadence.web;

import android.app.PendingIntent;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.os.Build;
import android.net.Uri;
import android.os.Handler;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import androidx.annotation.Nullable;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.exoplayer.LoadControl;
import androidx.media3.exoplayer.DefaultLoadControl;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;
import androidx.media3.session.DefaultMediaNotificationProvider;

public class CadenceMediaService extends MediaSessionService {
    private static final String TAG = "CadenceMediaService";
    private static final String PLAYBACK_CHANNEL_ID = "cadence_playback";

    public static final String ACTION_PLAY_TRACK = "com.cadence.web.ACTION_PLAY_TRACK";
    public static final String ACTION_STOP = "com.cadence.web.ACTION_STOP";
    public static final String ACTION_PLAY = "com.cadence.web.ACTION_PLAY";
    public static final String ACTION_PAUSE = "com.cadence.web.ACTION_PAUSE";
    public static final String ACTION_PREV = "com.cadence.web.ACTION_PREV";
    public static final String ACTION_NEXT = "com.cadence.web.ACTION_NEXT";
    public static final String ACTION_SEEK = "com.cadence.web.ACTION_SEEK";
    public static final String ACTION_SYNC_PROGRESS = "com.cadence.web.ACTION_SYNC_PROGRESS";

    public static final String EXTRA_VIDEO_ID = "extra_video_id";
    public static final String EXTRA_TITLE = "extra_title";
    public static final String EXTRA_ARTIST = "extra_artist";
    public static final String EXTRA_ARTWORK_URL = "extra_artwork_url";
    public static final String EXTRA_BACKEND_URL = "extra_backend_url";
    public static final String EXTRA_IS_PLAYING = "extra_is_playing";
    public static final String EXTRA_POSITION_MS = "extra_position_ms";
    public static final String EXTRA_QUEUE_JSON = "extra_queue_json";

    private ExoPlayer player;
    private MediaSession mediaSession;
    private Handler progressHandler;
    private String currentVideoId;
    private String currentTitle;
    private String currentArtist;
    private String currentArtworkUrl;
    private boolean resolving;
    private int resolveGeneration;
    private int recoveryAttempts;
    private JSONArray queueJson;
    private static CadenceMediaService instance;
    private final Runnable progressReporter = new Runnable() {
        @Override
        public void run() {
            if (player != null && player.getPlayWhenReady()) {
                reportProgress(player.isPlaying());
                progressHandler.postDelayed(this, 500);
            }
        }
    };

    private void reportProgress(boolean isPlaying) {
        MainActivity activity = MainActivity.getInstance();
        if (activity != null && player != null) {
            activity.handleNativeProgress(
                    player.getCurrentPosition(),
                    player.getDuration(),
                    isPlaying
            );
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        progressHandler = new Handler(getMainLooper());
        createPlaybackNotificationChannel();

        AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                .setUsage(C.USAGE_MEDIA)
                .build();

        LoadControl loadControl = new DefaultLoadControl.Builder()
                .setBufferDurationsMs(30_000, 120_000, 2_500, 5_000)
                .build();
        player = new ExoPlayer.Builder(this)
                .setLoadControl(loadControl)
                .setAudioAttributes(audioAttributes, true)
                .setHandleAudioBecomingNoisy(true)
                .build();
        player.addListener(new Player.Listener() {
            @Override
            public void onMediaItemTransition(MediaItem mediaItem, int reason) {
                if (mediaItem == null) return;
                resolving = false;
                String mediaId = mediaItem.mediaId;
                currentVideoId = extractVideoId(mediaId);
                currentTitle = mediaItem.mediaMetadata.title == null
                        ? null : mediaItem.mediaMetadata.title.toString();
                currentArtist = mediaItem.mediaMetadata.artist == null
                        ? null : mediaItem.mediaMetadata.artist.toString();
                currentArtworkUrl = mediaItem.mediaMetadata.artworkUri == null
                        ? null : mediaItem.mediaMetadata.artworkUri.toString();
                MainActivity activity = MainActivity.getInstance();
                if (activity != null) activity.handleNativeTrack(currentVideoId);
                if (mediaItem.localConfiguration != null
                        && "tunespark".equals(mediaItem.localConfiguration.uri.getScheme())) {
                    resolveCurrentTrack(player.getPlayWhenReady());
                }
            }

            @Override
            public void onIsPlayingChanged(boolean isPlaying) {
                reportProgress(isPlaying);
                progressHandler.removeCallbacks(progressReporter);
                if (isPlaying) progressHandler.post(progressReporter);
            }

            @Override
            public void onPlaybackStateChanged(int playbackState) {
                reportProgress(player.getPlayWhenReady());
            }

            @Override
            public void onTimelineChanged(androidx.media3.common.Timeline timeline, int reason) {
                reportProgress(player.getPlayWhenReady());
            }

            @Override
            public void onPlayerError(PlaybackException error) {
                Log.e(TAG, "Native playback failed", error);
                if (recoveryAttempts < 2) {
                    recoveryAttempts++;
                    resolveCurrentTrack(true);
                } else if (player.hasNextMediaItem()) {
                    player.seekToNextMediaItem();
                }
            }
        });
        Intent sessionIntent = new Intent(this, MainActivity.class);
        sessionIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent sessionActivity = PendingIntent.getActivity(
                this,
                0,
                sessionIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        mediaSession = new MediaSession.Builder(this, player)
                .setSessionActivity(sessionActivity)
                .build();
        setMediaNotificationProvider(
                new DefaultMediaNotificationProvider.Builder(this)
                        .setChannelId(PLAYBACK_CHANNEL_ID)
                        .setChannelName(R.string.app_name)
                        .build()
        );
    }

    private void createPlaybackNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    PLAYBACK_CHANNEL_ID,
                    getString(R.string.app_name),
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Now playing and playback controls");
            channel.setShowBadge(false);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }

    @Override
    public int onStartCommand(@Nullable Intent intent, int flags, int startId) {
        if (intent == null) return START_STICKY;

        String action = intent.getAction();
        if (ACTION_PLAY_TRACK.equals(action)) {
            resolveAndPlay(
                    intent.getStringExtra(EXTRA_VIDEO_ID),
                    intent.getStringExtra(EXTRA_TITLE),
                    intent.getStringExtra(EXTRA_ARTIST),
                    intent.getStringExtra(EXTRA_ARTWORK_URL),
                    intent.getStringExtra(EXTRA_BACKEND_URL),
                    intent.getStringExtra(EXTRA_QUEUE_JSON),
                    intent.getBooleanExtra(EXTRA_IS_PLAYING, true)
            );
        } else if (ACTION_PLAY.equals(action)) {
            if (player != null) player.play();
        } else if (ACTION_PAUSE.equals(action)) {
            if (player != null) player.pause();
        } else if (ACTION_SEEK.equals(action)) {
            if (player != null) {
                player.seekTo(Math.max(0L, intent.getLongExtra(EXTRA_POSITION_MS, 0L)));
            }
        } else if (ACTION_SYNC_PROGRESS.equals(action)) {
            reportProgress(player.getPlayWhenReady());
        } else if (ACTION_STOP.equals(action)) {
            stopPlayback();
        } else if (ACTION_NEXT.equals(action) || ACTION_PREV.equals(action)) {
            if (player != null && player.getMediaItemCount() > 1) {
                if (ACTION_NEXT.equals(action)) player.seekToNextMediaItem();
                else player.seekToPreviousMediaItem();
            } else {
                notifyWebPlayer(action);
            }
        }

        return START_STICKY;
    }

    private void resolveAndPlay(
            String videoId,
            String title,
            String artist,
            String artworkUrl,
            String backendUrl,
            String queueJsonValue,
            boolean shouldPlay
    ) {
        if (videoId == null || videoId.isEmpty()) {
            Log.e(TAG, "Missing native playback information");
            return;
        }

        currentVideoId = videoId;
        currentTitle = title;
        currentArtist = artist;
        currentArtworkUrl = artworkUrl;
        try {
            queueJson = queueJsonValue == null ? new JSONArray() : new JSONArray(queueJsonValue);
        } catch (Exception error) {
            Log.w(TAG, "Invalid native queue data; playing only the selected track", error);
            queueJson = new JSONArray();
        }
        recoveryAttempts = 0;
        resolveGeneration++;
        runOnPlayerThread(() -> {
            if (resolveGeneration <= 0 || player == null) return;
            try {
                JSONArray items = new JSONArray();
                if (queueJson.length() == 0) {
                    JSONObject selected = new JSONObject();
                    selected.put("id", videoId);
                    selected.put("title", title == null ? "Cadence Music" : title);
                    selected.put("artist", artist == null ? "Playing" : artist);
                    selected.put("artworkUrl", artworkUrl == null ? "" : artworkUrl);
                    items.put(selected);
                } else {
                    for (int index = 0; index < queueJson.length(); index++) {
                        JSONObject item = queueJson.getJSONObject(index);
                        if (videoId.equals(item.optString("id"))) {
                            items.put(item);
                        }
                    }
                    if (items.length() == 0) {
                        JSONObject selected = new JSONObject();
                        selected.put("id", videoId);
                        selected.put("title", title == null ? "Cadence Music" : title);
                        selected.put("artist", artist == null ? "Playing" : artist);
                        selected.put("artworkUrl", artworkUrl == null ? "" : artworkUrl);
                        items.put(selected);
                    }
                    for (int index = 0; index < queueJson.length(); index++) {
                        JSONObject item = queueJson.getJSONObject(index);
                        if (!videoId.equals(item.optString("id"))) items.put(item);
                    }
                }
                if (items.length() == 0) {
                    throw new IllegalStateException("Native queue is empty");
                }
                MediaItem[] mediaItems = new MediaItem[items.length()];
                for (int index = 0; index < items.length(); index++) {
                    mediaItems[index] = createUnresolvedMediaItem(items.getJSONObject(index), index);
                }
                player.setMediaItems(java.util.Arrays.asList(mediaItems), 0, 0);
                player.prepare();
                player.setPlayWhenReady(shouldPlay);
                resolveCurrentTrack(shouldPlay);
            } catch (Exception error) {
                Log.e(TAG, "Unable to create native playback queue", error);
            }
        });
    }

    private void applyResolvedStream(
            String videoId,
            String title,
            String artist,
            String artworkUrl,
            String streamUrl,
            boolean shouldPlay
    ) {
        MediaMetadata metadata = new MediaMetadata.Builder()
                .setTitle(title == null ? "Cadence Music" : title)
                .setArtist(artist == null ? "Playing" : artist)
                .setAlbumTitle("Cadence Music")
                .setArtworkUri(artworkUrl == null ? null : Uri.parse(artworkUrl))
                .build();
        MediaItem item = new MediaItem.Builder()
                .setMediaId(videoId)
                .setUri(Uri.parse(streamUrl))
                .setMediaMetadata(metadata)
                .build();
        int currentIndex = player.getCurrentMediaItemIndex();
        if (currentIndex < 0 || currentIndex >= player.getMediaItemCount()) return;
        player.replaceMediaItem(currentIndex, item);
        player.prepare();
        player.setPlayWhenReady(shouldPlay);
        MainActivity activity = MainActivity.getInstance();
        if (activity != null) activity.handleNativeTrack(videoId);
    }

    private MediaItem createUnresolvedMediaItem(JSONObject song, int index) {
        String videoId = song.optString("id");
        MediaMetadata metadata = new MediaMetadata.Builder()
                .setTitle(song.optString("title", "Cadence Music"))
                .setArtist(song.optString("artist", "Playing"))
                .setAlbumTitle("Cadence Music")
                .setArtworkUri(Uri.parse(song.optString("artworkUrl")))
                .build();
        return new MediaItem.Builder()
                .setMediaId(videoId + ":" + index)
                .setUri(Uri.parse("tunespark://unresolved/" + videoId))
                .setMediaMetadata(metadata)
                .build();
    }

    private static String extractVideoId(String mediaId) {
        if (mediaId == null) return "";
        int qualifier = mediaId.indexOf('#');
        String normalized = qualifier >= 0 ? mediaId.substring(0, qualifier) : mediaId;
        int separator = normalized.indexOf(':');
        return separator >= 0 ? normalized.substring(0, separator) : normalized;
    }

    private void resolveCurrentTrack(boolean shouldPlay) {
        if (currentVideoId == null || resolving) return;
        resolving = true;
        final String videoId = currentVideoId;
        final int generation = ++resolveGeneration;
        new Thread(() -> {
            try {
                String streamUrl = StreamUrlResolver.resolveBlocking(videoId);
                if (streamUrl == null || streamUrl.isEmpty()) {
                    throw new IllegalStateException("No replacement audio URL returned");
                }
                runOnPlayerThread(() -> {
                    resolving = false;
                    if (generation != resolveGeneration || !videoId.equals(currentVideoId)) return;
                    applyResolvedStream(
                            videoId,
                            currentTitle,
                            currentArtist,
                            currentArtworkUrl,
                            streamUrl,
                            shouldPlay
                    );
                });
            } catch (Exception error) {
                resolving = false;
                Log.e(TAG, "Unable to recover native audio stream", error);
                runOnPlayerThread(() -> {
                    if (generation != resolveGeneration || player == null) return;
                    if (player.hasNextMediaItem()) {
                        player.seekToNextMediaItem();
                    } else {
                        player.pause();
                    }
                });
            }
        }).start();
    }

    private void runOnPlayerThread(Runnable action) {
        new android.os.Handler(getMainLooper()).post(action);
    }

    private void notifyWebPlayer(String action) {
        MainActivity activity = MainActivity.getInstance();
        if (activity != null) activity.handleMediaControl(action);
    }

    private void stopPlayback() {
        if (player != null) {
            resolveGeneration++;
            currentVideoId = null;
            recoveryAttempts = 0;
            player.stop();
            player.clearMediaItems();
        }
        stopSelf();
    }

    @Nullable
    @Override
    public MediaSession onGetSession(MediaSession.ControllerInfo controllerInfo) {
        return mediaSession;
    }

    @Override
    public void onTaskRemoved(@Nullable Intent rootIntent) {
        // Match Tunespark: removing the task from recents ends the playback service.
        if (player != null) {
            player.pause();
            player.stop();
        }
        stopSelf();
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        if (progressHandler != null) progressHandler.removeCallbacksAndMessages(null);
        if (mediaSession != null) mediaSession.release();
        if (player != null) player.release();
        if (instance == this) instance = null;
        super.onDestroy();
    }

    public static void syncProgress() {
        if (instance != null) {
            instance.reportProgress(instance.player != null && instance.player.getPlayWhenReady());
        }
    }
}
