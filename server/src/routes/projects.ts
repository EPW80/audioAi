import { Router } from 'express';
import {
  createProject,
  getProjects,
  getProject,
  updateProjectSettings,
  updateProjectKeyframes,
  deleteProject,
} from '../controllers/projectController.js';
import { authMiddleware } from '../middleware/auth.js';
import { uploadAudio } from '../middleware/upload.js';

const router = Router();

router.use(authMiddleware);

router.post('/', uploadAudio.single('audio'), createProject);
router.get('/', getProjects);
router.get('/:id', getProject);
router.patch('/:id/settings', updateProjectSettings);
router.patch('/:id/keyframes', updateProjectKeyframes);
router.delete('/:id', deleteProject);

export default router;
