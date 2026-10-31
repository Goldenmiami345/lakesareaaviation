import littlefalls from "../assets/journey/little-falls-wide.webp.asset.json";
import fortlupton from "../assets/journey/fort-lupton-wide.webp.asset.json";
import cottonwood from "../assets/journey/cottonwood-wide.webp.asset.json";
// USGS NAIP wide photos aligned with SIFT/RANSAC, >1,800 matching landmark inliers.
export const airportBackdrops: Record<string,{url:string;transform:string}> = {
 "KLXL":{url:littlefalls.url,transform:"matrix(0.8466695771999869 3.0169486541204108e-06 -3.0169486541204108e-06 0.8466695771999869 -121.41970594789412 -87.43883437282594)"},
 "18V":{url:fortlupton.url,transform:"matrix(1.1225862560338273 3.8178263952873135e-05 -3.8178263952873135e-05 1.1225862560338273 -331.9006330347534 -459.10838486908887)"},
 "P52":{url:cottonwood.url,transform:"matrix(1.1191953012840774 1.4075172697741297e-05 -1.4075172697741297e-05 1.1191953012840774 -319.68319232712327 -292.9580879356377)"},
};
