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
    public static final String EXTRA_START_INDEX = "extra_start_index";
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
    private String resolvingVideoId;
    private int resolveGeneration;
    private int recoveryAttempts;
    private boolean playbackRequested;
    private int queueAppendIndex = -1;
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

    public static boolean dispatchControl(String action) {
        CadenceMediaService service = instance;
        if (service == null || service.player == null) return false;

        service.runOnPlayerThread(() -> {
            if (ACTION_PLAY.equals(action)) {
                service.playbackRequested = true;
                service.player.play();
            } else if (ACTION_PAUSE.equals(action)) {
                service.playbackRequested = false;
                service.player.pause();
            } else if (ACTION_NEXT.equals(action)) {
                service.player.seekToNextMediaItem();
            } else if (ACTION_PREV.equals(action)) {
                service.player.seekToPreviousMediaItem();
            } else if (ACTION_STOP.equals(action)) {
                service.stopPlayback();
            }
        });
        return true;
    }

    public static boolean dispatchSeek(long positionMs) {
        CadenceMediaService service = instance;
        if (service == null || service.player == null) return false;

        service.runOnPlayerThread(() -> service.player.seekTo(Math.max(0L, positionMs)));
        return true;
    }

    public static boolean dispatchReorderQueue(String orderedIdsJson) {
        CadenceMediaService service = instance;
        if (service == null || service.player == null || orderedIdsJson == null) {
            return false;
        }

        service.runOnPlayerThread(() -> {
            try {
                JSONArray orderedIds = new JSONArray(orderedIdsJson);
                for (int targetIndex = 0; targetIndex < orderedIds.length(); targetIndex++) {
                    String targetId = orderedIds.optString(targetIndex);
                    if (targetId.isEmpty() || targetIndex >= service.player.getMediaItemCount()) {
                        continue;
                    }
                    int currentIndex = -1;
                    for (int index = targetIndex; index < service.player.getMediaItemCount(); index++) {
                        if (targetId.equals(extractVideoId(
                                service.player.getMediaItemAt(index).mediaId))) {
                            currentIndex = index;
                            break;
                        }
                    }
                    if (currentIndex >= 0 && currentIndex != targetIndex) {
                        service.player.moveMediaItem(currentIndex, targetIndex);
                    }
                }
            } catch (Exception error) {
                Log.e(TAG, "Unable to reorder native queue", error);
            }
        });
        return true;
    }

    public static boolean dispatchPlayQueuedTrack(String videoId) {
        CadenceMediaService service = instance;
        if (service == null || service.player == null || service.player.getMediaItemCount() == 0
                || videoId == null || videoId.isEmpty()) {
            return false;
        }

        boolean found = false;
        for (int index = 0; index < service.player.getMediaItemCount(); index++) {
            if (videoId.equals(extractVideoId(service.player.getMediaItemAt(index).mediaId))) {
                found = true;
                break;
            }
        }
        if (!found) return false;

        service.runOnPlayerThread(() -> {
            for (int index = 0; index < service.player.getMediaItemCount(); index++) {
                if (videoId.equals(extractVideoId(service.player.getMediaItemAt(index).mediaId))) {
                    service.playbackRequested = true;
                    service.resolveGeneration++;
                    service.resolving = false;
                    service.resolvingVideoId = null;
                    service.currentVideoId = videoId;
                    service.currentTitle = service.player.getMediaItemAt(index)
                            .mediaMetadata.title == null
                            ? null
                            : service.player.getMediaItemAt(index).mediaMetadata.title.toString();
                    service.currentArtist = service.player.getMediaItemAt(index)
                            .mediaMetadata.artist == null
                            ? null
                            : service.player.getMediaItemAt(index).mediaMetadata.artist.toString();
                    service.currentArtworkUrl = service.player.getMediaItemAt(index)
                            .mediaMetadata.artworkUri == null
                            ? null
                            : service.player.getMediaItemAt(index).mediaMetadata.artworkUri.toString();
                    service.player.seekTo(index, 0L);
                    service.player.setPlayWhenReady(true);
                    service.resolveCurrentTrack(true);
                    service.player.play();
                    return;
                }
            }
            Log.w(TAG, "Requested queued track was not found: " + videoId);
        });
        return true;
    }

    public static boolean dispatchPlayTrackAfterCurrent(
            String videoId,
            String title,
            String artist,
            String artworkUrl
    ) {
        CadenceMediaService service = instance;
        if (service == null || service.player == null || service.player.getMediaItemCount() == 0
                || videoId == null || videoId.isEmpty()) {
            return false;
        }

        service.runOnPlayerThread(() -> {
            int currentIndex = service.player.getCurrentMediaItemIndex();
            int insertIndex = currentIndex < 0
                    ? service.player.getMediaItemCount()
                    : currentIndex + 1;
            service.queueAppendIndex = -1;
            service.playbackRequested = true;
            service.resolveGeneration++;
            service.resolving = true;
            service.resolvingVideoId = videoId;
            service.currentVideoId = videoId;
            service.currentTitle = title;
            service.currentArtist = artist;
            service.currentArtworkUrl = artworkUrl;
            service.resolveAndPlayInsertedTrack(
                    videoId,
                    title,
                    artist,
                    artworkUrl,
                    insertIndex
            );
        });
        return true;
    }

    private void resolveAndPlayInsertedTrack(
            String videoId,
            String title,
            String artist,
            String artworkUrl,
            int targetIndex
    ) {
        final int generation = resolveGeneration;
        new Thread(() -> {
            try {
                String streamUrl = StreamUrlResolver.resolveBlocking(videoId);
                if (streamUrl == null || streamUrl.isEmpty()) {
                    throw new IllegalStateException("No replacement audio URL returned");
                }
                runOnPlayerThread(() -> {
                    resolving = false;
                    resolvingVideoId = null;
                    if (generation != resolveGeneration
                            || player == null
                            || targetIndex < 0
                            || targetIndex > player.getMediaItemCount()) {
                        return;
                    }
                    MediaItem item = createResolvedMediaItem(
                            videoId, title, artist, artworkUrl, streamUrl
                    );
                    player.addMediaItem(targetIndex, item);
                    player.seekTo(targetIndex, 0L);
                    player.prepare();
                    playbackRequested = true;
                    player.play();
                    MainActivity activity = MainActivity.getInstance();
                    if (activity != null) activity.handleNativeTrack(videoId);
                });
            } catch (Exception error) {
                resolving = false;
                Log.e(TAG, "Unable to resolve selected track", error);
            }
        }).start();
    }

    private MediaItem createResolvedMediaItem(
            String videoId,
            String title,
            String artist,
            String artworkUrl,
            String streamUrl
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
        return item;
    }

    public static boolean dispatchAddToQueue(
            String videoId,
            String title,
            String artist,
            String artworkUrl
    ) {
        CadenceMediaService service = instance;
        if (service == null || service.player == null || videoId == null || videoId.isEmpty()) {
            return false;
        }

        service.runOnPlayerThread(() -> {
            if (service.player.getMediaItemCount() == 0) {
                return;
            }
            JSONObject song = new JSONObject();
            try {
                song.put("id", videoId);
                song.put("title", title == null ? "Cadence Music" : title);
                song.put("artist", artist == null ? "Playing" : artist);
                song.put("artworkUrl", artworkUrl == null ? "" : artworkUrl);
                int currentIndex = service.player.getCurrentMediaItemIndex();
                int insertIndex = service.queueAppendIndex >= 0
                        ? service.queueAppendIndex + 1
                        : currentIndex + 1;
                insertIndex = Math.max(0, Math.min(insertIndex, service.player.getMediaItemCount()));
                service.player.addMediaItem(
                        insertIndex,
                        service.createUnresolvedMediaItem(song, insertIndex)
                );
                service.queueAppendIndex = insertIndex;
            } catch (Exception error) {
                Log.e(TAG, "Unable to append song to native queue", error);
            }
        });
        return true;
    }

    public static boolean dispatchAppendToQueue(
            String videoId,
            String title,
            String artist,
            String artworkUrl
    ) {
        CadenceMediaService service = instance;
        if (service == null || service.player == null || videoId == null || videoId.isEmpty()) {
            return false;
        }

        service.runOnPlayerThread(() -> {
            JSONObject song = new JSONObject();
            try {
                song.put("id", videoId);
                song.put("title", title == null ? "Cadence Music" : title);
                song.put("artist", artist == null ? "Playing" : artist);
                song.put("artworkUrl", artworkUrl == null ? "" : artworkUrl);
                service.player.addMediaItem(
                        service.player.getMediaItemCount(),
                        service.createUnresolvedMediaItem(
                                song,
                                service.player.getMediaItemCount()
                        )
                );
            } catch (Exception error) {
                Log.e(TAG, "Unable to append recommended song to native queue", error);
            }
        });
        return true;
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
                String mediaId = mediaItem.mediaId;
                currentVideoId = extractVideoId(mediaId);
                currentTitle = mediaItem.mediaMetadata.title == null
                        ? null : mediaItem.mediaMetadata.title.toString();
                currentArtist = mediaItem.mediaMetadata.artist == null
                        ? null : mediaItem.mediaMetadata.artist.toString();
                currentArtworkUrl = mediaItem.mediaMetadata.artworkUri == null
                        ? null : mediaItem.mediaMetadata.artworkUri.toString();
                recoveryAttempts = 0;
                refreshPlaybackNotification();
                MainActivity activity = MainActivity.getInstance();
                if (activity != null) activity.handleNativeTrack(currentVideoId);
                if (mediaItem.localConfiguration != null
                        && "tunespark".equals(mediaItem.localConfiguration.uri.getScheme())) {
                    if (resolving && !currentVideoId.equals(resolvingVideoId)) {
                        resolveGeneration++;
                        resolving = false;
                        resolvingVideoId = null;
                    }
                    if (!resolving) {
                        resolveCurrentTrack(playbackRequested);
                    }
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
                MediaItem mediaItem = player.getCurrentMediaItem();
                if (playbackState == Player.STATE_READY
                        && mediaItem != null
                        && mediaItem.localConfiguration != null
                        && "tunespark".equals(mediaItem.localConfiguration.uri.getScheme())
                        && !resolving) {
                    resolveCurrentTrack(playbackRequested);
                }
            }

            @Override
            public void onTimelineChanged(androidx.media3.common.Timeline timeline, int reason) {
                reportProgress(player.getPlayWhenReady());
            }

            @Override
            public void onPlayerError(PlaybackException error) {
                Log.e(TAG, "Native playback failed", error);
                if (recoveryAttempts < 3) {
                    recoveryAttempts++;
                    playbackRequested = true;
                    resolveCurrentTrack(true, true);
                } else if (player.hasNextMediaItem()
                        && currentVideoId.equals(extractVideoId(
                                player.getCurrentMediaItem() == null
                                        ? null : player.getCurrentMediaItem().mediaId))) {
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
                    intent.getIntExtra(EXTRA_START_INDEX, 0),
                    intent.getBooleanExtra(EXTRA_IS_PLAYING, true)
            );
        } else if (ACTION_PLAY.equals(action)) {
            playbackRequested = true;
            if (player != null) player.play();
        } else if (ACTION_PAUSE.equals(action)) {
            playbackRequested = false;
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
            int startIndex,
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
        playbackRequested = shouldPlay;
        queueAppendIndex = -1;
        resolving = false;
        resolvingVideoId = null;
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
                    boolean selectedTrackIncluded = false;
                    for (int index = 0; index < queueJson.length(); index++) {
                        JSONObject item = queueJson.getJSONObject(index);
                        items.put(item);
                        if (videoId.equals(item.optString("id"))) {
                            selectedTrackIncluded = true;
                        }
                    }
                    if (!selectedTrackIncluded) {
                        JSONObject selected = new JSONObject();
                        selected.put("id", videoId);
                        selected.put("title", title == null ? "Cadence Music" : title);
                        selected.put("artist", artist == null ? "Playing" : artist);
                        selected.put("artworkUrl", artworkUrl == null ? "" : artworkUrl);
                        items.put(0, selected);
                    }
                }
                if (items.length() == 0) {
                    throw new IllegalStateException("Native queue is empty");
                }
                MediaItem[] mediaItems = new MediaItem[items.length()];
                for (int index = 0; index < items.length(); index++) {
                    mediaItems[index] = createUnresolvedMediaItem(items.getJSONObject(index), index);
                }
                int safeStartIndex = Math.max(0, Math.min(startIndex, mediaItems.length - 1));
                player.setMediaItems(java.util.Arrays.asList(mediaItems), safeStartIndex, 0);
                player.prepare();
                player.setPlayWhenReady(shouldPlay);
                if (shouldPlay) {
                    player.play();
                }
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
        long currentPosition = Math.max(0L, player.getCurrentPosition());
        player.replaceMediaItem(currentIndex, item);
        player.seekTo(currentIndex, currentPosition);
        player.prepare();
        if (shouldPlay) {
            player.play();
        } else {
            player.pause();
        }
        refreshPlaybackNotification();
        MainActivity activity = MainActivity.getInstance();
        if (activity != null) activity.handleNativeTrack(videoId);
    }

    private void refreshPlaybackNotification() {
        if (mediaSession != null) {
            onUpdateNotification(mediaSession, true);
        }
    }

    @Override
    public void onUpdateNotification(MediaSession session, boolean startInForeground) {
        super.onUpdateNotification(session, true);
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
        resolveCurrentTrack(shouldPlay, false);
    }

    private void resolveCurrentTrack(boolean shouldPlay, boolean force) {
        if (currentVideoId == null || (resolving && !force)) return;
        if (force && resolving) {
            resolveGeneration++;
            resolving = false;
            resolvingVideoId = null;
        }
        resolving = true;
        final String videoId = currentVideoId;
        resolvingVideoId = videoId;
        final int generation = ++resolveGeneration;
        new Thread(() -> {
            try {
                String streamUrl = StreamUrlResolver.resolveBlocking(videoId);
                if (streamUrl == null || streamUrl.isEmpty()) {
                    throw new IllegalStateException("No replacement audio URL returned");
                }
                runOnPlayerThread(() -> {
                    resolving = false;
                    resolvingVideoId = null;
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
                resolvingVideoId = null;
                Log.e(TAG, "Unable to recover native audio stream", error);
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
            resolvingVideoId = null;
            recoveryAttempts = 0;
            playbackRequested = false;
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
