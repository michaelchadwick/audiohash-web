task :deploy do |t|
  sh "git push origin master"
  sh "rsync -auP --exclude-from='rsync-exclude.txt' . $AUDIOHASH_REMOTE"
end

task :default => [:deploy]
