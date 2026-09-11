ffmpeg -i %1 -c:v libx264 -pix_fmt yuv420p -c:a an -g 48 -keyint_min 48 -sc_threshold 0 -movflags +faststart+frag_keyframe+empty_moov -b:v 384k -frag_duration 2000000 -brand iso6  %2 
