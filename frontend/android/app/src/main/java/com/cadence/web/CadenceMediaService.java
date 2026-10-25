package com.cadence.web;

import android.content.Intent;
import android.net.Uri;
import android.os.Handler;
import android.util.Log;

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

public class CadenceMediaService extends MediaSessionService {
    private static final String TAG = "CadenceMediaService";

    public static final String ACTION_PLAY_TRACK = "com.cadence.web.ACTION_PLAY_TRACK";
    public static final String ACTION_STOP = "com.cadence.web.ACTION_STOP";
    public static final String ACTION_PLAY = "com.cadence.web.ACTION_PLAY";
    public static final String ACTION_PAUSE = "com.cadence.web.ACTION_PAUSE";
    public static final String ACTION_PREV = "com.cadence.web.ACTION_PREV";
    public static final String ACTION_NEXT = "com.cadence.web.ACTION_NEXT";
    public static final String ACTION_SEEK = "com.cadence.web.ACTION_SEEK";

    public static final String EXTRA_VIDEO_ID = "extra_video_id";
    public static final String EXTRA_TITLE = "extra_title";
    public static final String EXTRA_ARTIST = "extra_artist";
    public static final String EXTRA_ARTWORK_URL = "extra_artwork_url";
    public static final String EXTRA_BACKEND_URL = "extra_backend_url";
    public static final String EXTRA_IS_PLAYING = "extra_is_playing";
    public static final String EXTRA_POSITION_MS = "extra_position_ms";

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
    private final Runnable progressReporter = new Runnable() {
        @Override
        public void run() {
            if (player != null && player.isPlaying()) {
                MainActivity activity = MainActivity.getInstance();
                if (activity != null) {
                    activity.handleNativeProgress(player.getCurrentPosition(), player.getDuration(), true);
                }
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
        progressHandler = new Handler(getMainLooper());

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
                }
            }
        });
        mediaSession = new MediaSession.Builder(this, player).build();
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
                    intent.getBooleanExtra(EXTRA_IS_PLAYING, true)
            );
        } else if (ACTION_PLAY.equals(action)) {
            player.play();
        } else if (ACTION_PAUSE.equals(action)) {
            player.pause();
        } else if (ACTION_SEEK.equals(action)) {
            player.seekTo(Math.max(0L, intent.getLongExtra(EXTRA_POSITION_MS, 0L)));
        } else if (ACTION_STOP.equals(action)) {
            stopPlayback();
        } else if (ACTION_NEXT.equals(action) || ACTION_PREV.equals(action)) {
            notifyWebPlayer(action);
        }

        return START_STICKY;
    }

    private void resolveAndPlay(
            String videoId,
            String title,
            String artist,
            String artworkUrl,
            String backendUrl,
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
        recoveryAttempts = 0;
        resolveGeneration++;
        int generation = resolveGeneration;
        new Thread(() -> {
            try {
                String streamUrl = StreamUrlResolver.resolveBlocking(videoId);
                if (streamUrl == null || streamUrl.isEmpty()) {
                    throw new IllegalStateException("No playable audio URL returned");
                }
                runOnPlayerThread(() -> {
                    if (generation != resolveGeneration) return;
                    applyResolvedStream(videoId, title, artist, artworkUrl, streamUrl, shouldPlay);
                });
            } catch (Exception error) {
                Log.e(TAG, "Unable to start native audio stream", error);
            }
        }).start();
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
        player.setMediaItem(item);
        player.prepare();
        player.setPlayWhenReady(shouldPlay);
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
                    if (generation != resolveGeneration) return;
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
        // Media3 keeps the foreground media session alive while the task is
        // backgrounded, which is the Spotify-style app-switch behavior.
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        if (progressHandler != null) progressHandler.removeCallbacksAndMessages(null);
        if (mediaSession != null) mediaSession.release();
        if (player != null) player.release();
        super.onDestroy();
    }
}
