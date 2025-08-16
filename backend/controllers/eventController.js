import Event from '../models/eventModel.js';
import { uploadJSONToIPFS, uploadFileToIPFS } from '../utils/ipfsUploader.js';

// Get all events
export const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 });
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// Create a new event
export const createEvent = async (req, res) => {
  const { name, description, date, venue, organizerAddress } = req.body;
  const imageFile = req.file;

  if (!name || !description || !date || !venue || !organizerAddress || !imageFile) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    // 1. Upload image to IPFS
    const imageUrl = await uploadFileToIPFS(imageFile);

    // 2. Upload metadata JSON to IPFS
    const metadata = {
      name,
      description,
      image: imageUrl,
      attributes: [
        { trait_type: 'Date', value: date },
        { trait_type: 'Venue', value: venue },
      ],
    };
    const ipfsMetadataURI = await uploadJSONToIPFS(metadata);

    // 3. Save event details to MongoDB
    const newEvent = new Event({
      name,
      description,
      date,
      venue,
      organizerAddress,
      ipfsMetadataURI,
      imageUrl,
    });
    await newEvent.save();

    res.status(201).json({ 
        message: 'Metadata prepared. Please sign the transaction to create the event on-chain.', 
        eventData: newEvent 
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create event', error: error.message });
  }
};

// Update event with contract address after on-chain creation
export const updateEventWithContract = async (req, res) => {
    const { eventId } = req.params;
    const { contractAddress } = req.body;
    try {
        const event = await Event.findByIdAndUpdate(
            eventId, 
            { contractAddress }, 
            { new: true }
        );
        if (!event) return res.status(404).json({ message: "Event not found" });
        res.status(200).json(event);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
}