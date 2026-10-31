import littlefalls from "../assets/journey/little-falls-wide.webp.asset.json";
import fortlupton from "../assets/journey/fort-lupton-wide.webp.asset.json";
import cottonwood from "../assets/journey/cottonwood-wide.webp.asset.json";
// USGS NAIP wide photos aligned with SIFT/RANSAC, >1,800 matching landmark inliers.
export const airportBackdrops: Record<string,{url:string;transform:string}> = {
 "KLXL":{url:littlefalls.url,transform:"matrix(1.693339772335212 2.349517252836004e-05 -2.349517252836004e-05 1.693339772335212 -934.0413533674009 -900.5657804912615)"},
 "18V":{url:fortlupton.url,transform:"matrix(2.244676246464192 -3.821659333724565e-05 3.821659333724565e-05 2.244676246464192 -1409.001630189627 -1536.2576097770168)"},
 "P52":{url:cottonwood.url,transform:"matrix(2.2377565799357035 3.384915936609434e-05 -3.384915936609434e-05 2.2377565799357035 -1393.6379790729693 -1366.859508155708)"},
};
