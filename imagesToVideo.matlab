clear all; clc; close all;

dataPath = './images';

figure()
imageWidth = 2000;
imageHeight = 2000;

axis([0, imageHeight, 0, imageWidth])
axis square
axis off
% axis manual

frameRate = 2;
writerObj = VideoWriter('rPlaceHeatmap.avi');
writerObj.FrameRate = frameRate;
open(writerObj);

imagesInfo = dir(dataPath);
for imageIdx = 1:size(imagesInfo, 1)
  startLoop = now;
  imageInfo = imagesInfo(imageIdx);
  if (imageInfo.isdir)
    continue
  end
  folder = imageInfo.folder;
  name = imageInfo.name;
  
  img = imread(strcat(strcat(folder, '\'), name), 'png');
  newImg = zeros(imageHeight, imageWidth, 3);
  for channel = 1:3
    page = img(:, :, channel);
    numRows = size(page, 1);
    numCols = size(page, 2);
    if numRows < imageHeight
      page = [page; zeros(imageHeight - numRows, numCols)];
    end
    if numCols < imageWidth
      page = [page, zeros(imageHeight, imageWidth - numCols)];
    end
    newImg(:, :, channel) = page;
  end
  imshow(newImg);
  drawnow
  writeVideo(writerObj, getframe(gcf))
  
  %     disp(idx / (frameRate * recordLength));
  
%   while (now - startLoop) * 10^5 < (1 / frameRate)
%   end
end

for i = 1:(frameRate * 5)
  writeVideo(writerObj, getframe(gcf))
end

close(writerObj)