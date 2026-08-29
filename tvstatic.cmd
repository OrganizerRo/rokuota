ffmpeg -y -i tvstatic.mp4 -c:v libx264 -b:v 512k -preset slow -maxrate 512k -bufsize 6024k -tune film -pass 1 -an -f null NUL 
ffmpeg -i tvstatic.mp4 -c:v libx264 -b:v 388K -vf scale=320:-1 -preset slow -maxrate 388k -bufsize 6024k -tune film -pass 2 -an tvstatic3p.mp4 
