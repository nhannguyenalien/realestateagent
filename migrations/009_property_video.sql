-- Optional property video; existing listings remain without a video.
ALTER TABLE properties ADD COLUMN IF NOT EXISTS video_url text;
