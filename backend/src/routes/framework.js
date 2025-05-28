/**
 * Memory Framework API Routes
 * Defines REST endpoints for the memory framework system
 */

const express = require('express');
const FrameworkController = require('../controllers/frameworkController');

const router = express.Router();
const frameworkController = new FrameworkController();

/**
 * @route GET /api/framework/context
 * @desc Get intelligent memory context for user input
 * @query {string} input - User input to analyze
 * @query {string} [conversation_context] - JSON string of conversation metadata
 * @returns {Object} Tiered memory context
 */
router.get('/context', async (req, res) => {
    await frameworkController.getContext(req, res);
});

/**
 * @route POST /api/framework/update
 * @desc Update memory based on conversation outcome
 * @body {string} user_input - Original user input
 * @body {string} assistant_response - Claude's response
 * @body {Object} [context_used] - Context that was used in the response
 * @returns {Object} Update confirmation
 */
router.post('/update', async (req, res) => {
    await frameworkController.updateMemory(req, res);
});

/**
 * @route GET /api/framework/analyze
 * @desc Analyze input and return framework recommendations
 * @query {string} input - User input to analyze
 * @returns {Object} Analysis results with triggers, confidence, and recommendations
 */
router.get('/analyze', async (req, res) => {
    await frameworkController.analyzeInput(req, res);
});

/**
 * @route GET /api/framework/health
 * @desc Health check for framework system
 * @returns {Object} System health status and metrics
 */
router.get('/health', async (req, res) => {
    await frameworkController.getHealth(req, res);
});

/**
 * @route GET /api/framework/stats
 * @desc Get framework usage statistics
 * @returns {Object} Detailed statistics about memory structure and usage
 */
router.get('/stats', async (req, res) => {
    await frameworkController.getStats(req, res);
});

/**
 * @route POST /api/framework/optimize
 * @desc Optimize memory structure based on usage patterns
 * @body {string} [strategy] - Optimization strategy to use
 * @returns {Object} Optimization results
 */
router.post('/optimize', async (req, res) => {
    await frameworkController.optimizeMemory(req, res);
});

module.exports = router;
