import express from 'express';
import multer from 'multer';
import { createEvent, getAllEvents, updateEventWithContract } from '../controllers/eventController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', getAllEvents);
router.post('/', upload.single('image'), createEvent);
router.put('/:eventId/contract', updateEventWithContract);

export default router;