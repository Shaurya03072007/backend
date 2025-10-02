const express = require('express');
const { body, validationResult } = require('express-validator');
const axios = require('axios');
const router = express.Router();

// Facebook Graph API base URL
const FACEBOOK_GRAPH_API = 'https://graph.facebook.com/v18.0';

/**
 * Exchange short-lived token for long-lived token
 * POST /api/facebook/exchange-token
 */
router.post('/exchange-token', [
  body('accessToken').notEmpty().withMessage('Access token is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { accessToken } = req.body;
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    if (!appId || !appSecret) {
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Facebook app credentials not configured'
      });
    }

    // Exchange short-lived token for long-lived token
    const exchangeUrl = `${FACEBOOK_GRAPH_API}/oauth/access_token`;
    const exchangeParams = {
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: accessToken
    };

    const exchangeResponse = await axios.get(exchangeUrl, { params: exchangeParams });
    const { access_token: longLivedToken, expires_in } = exchangeResponse.data;

    res.json({
      accessToken: longLivedToken,
      expiresIn: expires_in
    });

  } catch (error) {
    console.error('Token exchange error:', error.response?.data || error.message);
    
    const errorMessage = error.response?.data?.error?.message || 'Token exchange failed';
    const errorCode = error.response?.data?.error?.code || 500;
    
    res.status(errorCode >= 400 && errorCode < 500 ? errorCode : 500).json({
      error: 'Token exchange failed',
      message: errorMessage
    });
  }
});

/**
 * Get user information
 * GET /api/facebook/user
 */
router.get('/user', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Bearer token required'
      });
    }

    const accessToken = authHeader.substring(7);
    
    const userUrl = `${FACEBOOK_GRAPH_API}/me`;
    const userParams = {
      fields: 'id,name,email,picture',
      access_token: accessToken
    };

    const userResponse = await axios.get(userUrl, { params: userParams });
    const userData = userResponse.data;

    res.json({
      id: userData.id,
      name: userData.name,
      email: userData.email || '',
      picture: userData.picture?.data?.url || ''
    });

  } catch (error) {
    console.error('Get user info error:', error.response?.data || error.message);
    
    const errorMessage = error.response?.data?.error?.message || 'Failed to get user information';
    const errorCode = error.response?.data?.error?.code || 500;
    
    res.status(errorCode >= 400 && errorCode < 500 ? errorCode : 500).json({
      error: 'Failed to get user information',
      message: errorMessage
    });
  }
});

/**
 * Get user's Facebook pages
 * GET /api/facebook/pages
 */
router.get('/pages', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Bearer token required'
      });
    }

    const accessToken = authHeader.substring(7);
    
    const pagesUrl = `${FACEBOOK_GRAPH_API}/me/accounts`;
    const pagesParams = {
      fields: 'id,name,access_token,category',
      access_token: accessToken
    };

    const pagesResponse = await axios.get(pagesUrl, { params: pagesParams });
    const pagesData = pagesResponse.data.data || [];

    const pages = pagesData.map(page => ({
      id: page.id,
      name: page.name,
      accessToken: page.access_token,
      category: page.category
    }));

    res.json({ pages });

  } catch (error) {
    console.error('Get pages error:', error.response?.data || error.message);
    
    const errorMessage = error.response?.data?.error?.message || 'Failed to get pages';
    const errorCode = error.response?.data?.error?.code || 500;
    
    res.status(errorCode >= 400 && errorCode < 500 ? errorCode : 500).json({
      error: 'Failed to get pages',
      message: errorMessage
    });
  }
});

/**
 * Create a live video on a Facebook page
 * POST /api/facebook/live-video
 */
router.post('/live-video', [
  body('pageId').notEmpty().withMessage('Page ID is required'),
  body('title').notEmpty().withMessage('Title is required'),
  body('description').optional().isString(),
  body('pageAccessToken').notEmpty().withMessage('Page access token is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { pageId, title, description = '', pageAccessToken } = req.body;

    // Create live video
    const liveVideoUrl = `${FACEBOOK_GRAPH_API}/${pageId}/live_videos`;
    const liveVideoData = {
      title: title,
      description: description,
      status: 'LIVE_NOW',
      access_token: pageAccessToken
    };

    const liveVideoResponse = await axios.post(liveVideoUrl, liveVideoData);
    const liveVideo = liveVideoResponse.data;

    // Extract stream URL and key from the secure_stream_url
    const secureStreamUrl = liveVideo.secure_stream_url;
    if (!secureStreamUrl) {
      throw new Error('No secure stream URL returned from Facebook');
    }

    // Parse the RTMP URL to extract base URL and stream key
    const urlParts = secureStreamUrl.split('/');
    const streamKey = urlParts[urlParts.length - 1];
    const baseUrl = secureStreamUrl.replace(`/${streamKey}`, '/');

    res.json({
      id: liveVideo.id,
      streamUrl: baseUrl,
      streamKey: streamKey,
      title: title,
      description: description,
      permalinkUrl: liveVideo.permalink_url,
      embedHtml: liveVideo.embed_html
    });

  } catch (error) {
    console.error('Create live video error:', error.response?.data || error.message);
    
    const errorMessage = error.response?.data?.error?.message || 'Failed to create live video';
    const errorCode = error.response?.data?.error?.code || 500;
    
    res.status(errorCode >= 400 && errorCode < 500 ? errorCode : 500).json({
      error: 'Failed to create live video',
      message: errorMessage
    });
  }
});

/**
 * Get live video status
 * GET /api/facebook/live-video/:videoId
 */
router.get('/live-video/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const pageAccessToken = req.query.pageAccessToken;

    if (!pageAccessToken) {
      return res.status(400).json({
        error: 'Missing parameter',
        message: 'pageAccessToken is required'
      });
    }

    const videoUrl = `${FACEBOOK_GRAPH_API}/${videoId}`;
    const videoParams = {
      fields: 'id,status,stream_url,secure_stream_url,title,description,permalink_url,embed_html',
      access_token: pageAccessToken
    };

    const videoResponse = await axios.get(videoUrl, { params: videoParams });
    const video = videoResponse.data;

    res.json(video);

  } catch (error) {
    console.error('Get live video error:', error.response?.data || error.message);
    
    const errorMessage = error.response?.data?.error?.message || 'Failed to get live video';
    const errorCode = error.response?.data?.error?.code || 500;
    
    res.status(errorCode >= 400 && errorCode < 500 ? errorCode : 500).json({
      error: 'Failed to get live video',
      message: errorMessage
    });
  }
});

/**
 * End live video
 * POST /api/facebook/live-video/:videoId/end
 */
router.post('/live-video/:videoId/end', async (req, res) => {
  try {
    const { videoId } = req.params;
    const { pageAccessToken } = req.body;

    if (!pageAccessToken) {
      return res.status(400).json({
        error: 'Missing parameter',
        message: 'pageAccessToken is required'
      });
    }

    const endVideoUrl = `${FACEBOOK_GRAPH_API}/${videoId}`;
    const endVideoData = {
      end_live_video: true,
      access_token: pageAccessToken
    };

    const endResponse = await axios.post(endVideoUrl, endVideoData);
    
    res.json({
      success: true,
      message: 'Live video ended successfully',
      data: endResponse.data
    });

  } catch (error) {
    console.error('End live video error:', error.response?.data || error.message);
    
    const errorMessage = error.response?.data?.error?.message || 'Failed to end live video';
    const errorCode = error.response?.data?.error?.code || 500;
    
    res.status(errorCode >= 400 && errorCode < 500 ? errorCode : 500).json({
      error: 'Failed to end live video',
      message: errorMessage
    });
  }
});

module.exports = router;
