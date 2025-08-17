import { load } from "cheerio";
import { facebookRegex, fixThumbnail, instagramRegex, normalizeURL, tiktokRegex, twitterRegex, userAgent } from "./utils";
import type { SnapSaveDownloaderData, SnapSaveDownloaderMedia, SnapSaveDownloaderResponse } from "./types";
import { decryptSnapSave, decryptSnaptik } from "./decrypter";

export const snapsave = async (url: string): Promise<SnapSaveDownloaderResponse> => {
  try {
    const regexList = [facebookRegex, instagramRegex, twitterRegex, tiktokRegex];
    const isValid = regexList.some(regex => url.match(regex));
    if (!isValid) return { success: false, message: "Invalid URL" };
    const isTwitter = url.match(twitterRegex);
    const isTiktok = url.match(tiktokRegex);

    const formData = new URLSearchParams();
    formData.append("url", normalizeURL(url));

    if (isTiktok) {
      const response = await fetch("https://snaptik.app/", {
        headers: {
          "user-agent": userAgent,
          "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "accept-language": "en-US,en;q=0.5",
          "cache-control": "no-cache"
        }
      });
      const homeHtml = await response.text();
      const $ = load(homeHtml);
      const token = $("input[name='token']").val() as string;
      
      if (token) {
        formData.append("token", token);
      }
      
      const response2 = await fetch("https://snaptik.app/abc2.php", {
        method: "POST",
        headers: {
          "accept": "*/*",
          "content-type": "application/x-www-form-urlencoded",
          "origin": "https://snaptik.app",
          "referer": "https://snaptik.app/",
          "user-agent": userAgent,
          "x-requested-with": "XMLHttpRequest"
        },
        body: formData
      });
      const data = await response2.text();
      const decode = decryptSnaptik(data);
      const $3 = load(decode);
      
      // Extract all possible download links with quality info
      const downloadLinks: any[] = [];
      
      $3("a").each((_, el) => {
        const href = $3(el).attr("href");
        const text = $3(el).text().trim();
        
        if (href && (href.includes("snaptik") || href.includes("tikmate") || href.includes("download") || $3(el).hasClass("download-file"))) {
          let quality = 0;
          if (text.includes("HD") || text.includes("1080")) quality = 1080;
          else if (text.includes("720")) quality = 720;
          else if (text.includes("480")) quality = 480;
          else if (text.includes("360")) quality = 360;
          else quality = 500; // default for unknown quality
          
          downloadLinks.push({
            url: href,
            quality,
            text,
            type: text.includes("photo") || text.includes("Photo") ? "image" : "video"
          });
        }
      });
      
      // Sort by quality (highest first)
      downloadLinks.sort((a, b) => b.quality - a.quality);
      
      // Get the best quality link
      const bestLink = downloadLinks[0];
      let _url = bestLink?.url;
      const type = bestLink?.type || "video";
      
      // Enhanced description extraction for TikTok
      let description = $3(".video-title").text().trim() ||
                       $3(".video-des").text().trim() ||
                       $3("h3").first().text().trim() ||
                       $3(".desc").text().trim() ||
                       $3(".video-description").text().trim() ||
                       $3("p").first().text().trim() ||
                       $3(".title").text().trim();
      
      // Clean up description and add fallback
      if (description) {
        description = description.replace(/\s+/g, ' ').trim();
        // Remove common unwanted text
        description = description.replace(/^(TikTok|Video|Download|Share)[\s:]*/, '').trim();
      }
      
      // Try multiple selectors for preview
      let preview = $3("#thumbnail").attr("src") ||
                   $3("img[src*='tiktok']").first().attr("src") ||
                   $3(".video-thumb img").first().attr("src") ||
                   $3("img").first().attr("src");
      
      if (!_url) {
        // Fallback: try to extract any download link
        $3("a").each((_, el) => {
          const href = $3(el).attr("href");
          if (href && (href.includes("download") || href.includes("snaptik") || href.includes("tikmate"))) {
            _url = href;
            return false; // break
          }
        });
      }
      
      // Ensure we have a proper fallback title
      if (!description || description.length < 3) {
        description = "TikTok Video";
      }
      
      return { success: true, data: { description, preview, media: [{ url: _url, type }] } };
    }
    if (isTwitter) {
      const response = await fetch("https://twitterdownloader.snapsave.app/", {
        headers: {
          "user-agent": userAgent,
          "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });
      const homeHtml = await response.text();
      const $ = load(homeHtml);
      const token = $("input[name='token']").val() as string;
      
      if (token) {
        formData.append("token", token);
      }
      
      const response2 = await fetch("https://twitterdownloader.snapsave.app/action.php", {
        method: "POST",
        headers: {
          "accept": "*/*",
          "content-type": "application/x-www-form-urlencoded",
          "origin": "https://twitterdownloader.snapsave.app",
          "referer": "https://twitterdownloader.snapsave.app/",
          "user-agent": userAgent,
          "x-requested-with": "XMLHttpRequest"
        },
        body: formData
      });
      const data = await response2.json();
      const html2 = data?.data;
      const $2 = load(html2);
      
      // Extract Twitter/X download links with quality prioritization
      const twitterLinks: any[] = [];
      
      $2("a").each((_, el) => {
        const href = $2(el).attr("href");
        const text = $2(el).text().trim();
        
        if (href && (href.includes("download") || href.includes("rapidcdn") || href.includes("snapsave"))) {
          let quality = 0;
          if (text.includes("HD") || href.includes("hd") || text.includes("1080")) quality = 1080;
          else if (text.includes("720")) quality = 720;
          else if (text.includes("480")) quality = 480;
          else quality = 500; // default
          
          twitterLinks.push({
            url: href,
            quality,
            text,
            type: text.includes("photo") || text.includes("Photo") ? "image" : "video"
          });
        }
      });
      
      // Sort by quality (highest first)
      twitterLinks.sort((a, b) => b.quality - a.quality);
      
      const bestTwitterLink = twitterLinks[0];
      let _url = bestTwitterLink?.url;
      const type = bestTwitterLink?.type || "video";
      
      // Enhanced description extraction for Twitter/X
      let description = $2(".videotikmate-middle > p > span").text().trim() ||
                       $2(".video-title").text().trim() ||
                       $2("p").first().text().trim() ||
                       $2(".desc").text().trim() ||
                       $2("h3").text().trim();
      
      // Clean up description
      if (description) {
        description = description.replace(/\s+/g, ' ').trim();
        description = description.replace(/^(Twitter|X|Video|Download|Share)[\s:]*/, '').trim();
      }
      
      let preview = $2(".videotikmate-left > img").attr("src") ||
                   $2("img[src*='pbs.twimg']").first().attr("src") ||
                   $2("img").first().attr("src");
      
      // Ensure we have a proper fallback title
      if (!description || description.length < 3) {
        description = "Twitter/X Post";
      }
      
      return { success: true, data: { description, preview, media: [{ url: _url, type }] } };
    }

    const response = await fetch("https://snapsave.app/action.php?lang=en", {
      method: "POST",
      headers: {
        "accept": "*/*",
        "content-type": "application/x-www-form-urlencoded",
        "origin": "https://snapsave.app",
        "referer": "https://snapsave.app/",
        "user-agent": userAgent
      },
      body: formData
    });

    const html = await response.text();
    const decode = decryptSnapSave(html);
    const $ = load(decode);
    const data: SnapSaveDownloaderData = {};
    const media: SnapSaveDownloaderMedia[] = [];

    if ($("table.table").length || $("article.media > figure").length) {
      // Enhanced Facebook description/title extraction
      let description = $("span.video-des").text().trim() ||
                       $(".video-title").text().trim() ||
                       $("h1").first().text().trim() ||
                       $("h2").first().text().trim() ||
                       $("h3").first().text().trim() ||
                       $(".title").text().trim() ||
                       $(".desc").text().trim() ||
                       $(".video-description").text().trim() ||
                       $("p").first().text().trim() ||
                       $("meta[property='og:title']").attr("content") ||
                       $("title").text().trim();
      
      // Clean up Facebook description
      if (description) {
        description = description.replace(/\s+/g, ' ').trim();
        // Remove common Facebook unwanted text
        description = description.replace(/^(Facebook|Video|Watch|Share|Download)[\s:]*/, '').trim();
        description = description.replace(/\|\s*Facebook$/, '').trim();
        description = description.replace(/on Facebook$/, '').trim();
      }
      
      const preview = $("article.media > figure").find("img").attr("src") ||
                     $("img[src*='fbcdn']").first().attr("src") ||
                     $(".video-preview img").first().attr("src") ||
                     $("img").first().attr("src");
      
      data.description = description && description.length >= 3 ? description : "Facebook Video";
      data.preview = preview;
      
      if ($("table.table").length) {
        // Sort media by quality (prioritize HD)
        const mediaItems: any[] = [];
        
        $("tbody > tr").each((_, el) => {
          const $el = $(el);
          const $td = $el.find("td");
          const resolution = $td.eq(0).text().trim();
          let _url = $td.eq(2).find("a").attr("href") || $td.eq(2).find("button").attr("onclick");
          const shouldRender = /get_progressApi/ig.test(_url || "");
          if (shouldRender) {
            _url = "https://snapsave.app" + /get_progressApi\('(.*?)'\)/.exec(_url || "")?.[1] || _url;
          }
          // Remove duplicate dl parameters
          if (_url && _url.includes("&dl=1&dl=1")) {
            _url = _url.replace("&dl=1&dl=1", "&dl=1");
          }
          
          mediaItems.push({
            resolution,
            ...shouldRender ? { shouldRender } : {},
            url: _url,
            type: resolution ? "video" : "image"
          });
        });
        
        // Sort by quality priority (HD first, then descending resolution)
        mediaItems.sort((a, b) => {
          const getQualityScore = (res: string) => {
            if (res.includes("1080") || res.includes("HD")) return 1000;
            if (res.includes("720")) return 720;
            if (res.includes("480")) return 480;
            if (res.includes("360")) return 360;
            const match = res.match(/(\d+)p/);
            return match ? parseInt(match[1]) : 0;
          };
          return getQualityScore(b.resolution) - getQualityScore(a.resolution);
        });
        
        media.push(...mediaItems);
      }
      else if ($("div.card").length) {
        const cardItems: any[] = [];
        $("div.card").each((_, el) => {
          const cardBody = $(el).find("div.card-body");
          const aText = cardBody.find("a").text().trim();
          let url = cardBody.find("a").attr("href");
          const type = aText.includes("Photo") ? "image" : "video";
          // Remove duplicate dl parameters
          if (url && url.includes("&dl=1&dl=1")) {
            url = url.replace("&dl=1&dl=1", "&dl=1");
          }
          
          cardItems.push({
            url,
            type,
            quality: aText.includes("HD") || aText.includes("1080") ? 1000 : 
                    aText.includes("720") ? 720 : 
                    aText.includes("480") ? 480 : 360
          });
        });
        
        // Sort by quality (HD first)
        cardItems.sort((a, b) => b.quality - a.quality);
        cardItems.forEach(item => {
          const { quality, ...mediaItem } = item;
          media.push(mediaItem);
        });
      }
      else {
        let url = $("a[href*='download']").attr("href") || 
                 $("a").first().attr("href") || 
                 $("button").attr("onclick");
        const aText = $("a").text().trim() || $("button").text().trim();
        const type = aText.includes("Photo") || aText.includes("photo") ? "image" : "video";
        
        if (!url) {
          // Try to find any download link
          $("a").each((_, el) => {
            const href = $(el).attr("href");
            if (href && (href.includes("download") || href.includes("snapsave") || href.includes("rapidcdn"))) {
              url = href;
              return false; // break
            }
          });
        }
        
        media.push({
          url,
          type
        });
      }
    }
    else if ($("div.download-items").length) {
      const downloadItems: any[] = [];
      $("div.download-items").each((_, el) => {
        const itemThumbnail = $(el).find("div.download-items__thumb > img").attr("src");
        const itemBtn = $(el).find("div.download-items__btn");
        let url = itemBtn.find("a").attr("href");
        const spanText = itemBtn.find("span").text().trim();
        const type = spanText.includes("Photo") ? "image" : "video";
        // Remove duplicate dl parameters
        if (url && url.includes("&dl=1&dl=1")) {
          url = url.replace("&dl=1&dl=1", "&dl=1");
        }
        
        downloadItems.push({
          url,
          ...type === "video" ? {
            thumbnail: itemThumbnail ? fixThumbnail(itemThumbnail) : undefined
          } : {},
          type,
          quality: spanText.includes("HD") || url?.includes("hd") ? 1000 : 
                  spanText.includes("720") ? 720 : 360
        });
      });
      
      // Sort by quality (HD first)  
      downloadItems.sort((a, b) => b.quality - a.quality);
      downloadItems.forEach(item => {
        const { quality, ...mediaItem } = item;
        media.push(mediaItem);
      });
    }
    if (!media.length) return { success: false, message: "Blank data" };
    return { success: true, data: { ...data, media } };
  }
  catch (e) {
    return { success: false, message: "Something went wrong" };
  }
};
