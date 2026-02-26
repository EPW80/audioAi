import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  suggestStyles,
  getSuggestions,
  refinePromptHandler,
  updateAISettings,
  getAISettings,
} from '../controllers/aiController.js';

const router = Router();

router.use(authMiddleware);

router.post('/:projectId/suggest-styles', suggestStyles);
router.get('/:projectId/suggestions', getSuggestions);
router.post('/:projectId/refine-prompt', refinePromptHandler);
router.post('/:projectId/settings', updateAISettings);
router.get('/:projectId/settings', getAISettings);

export default router;
