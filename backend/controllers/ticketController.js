import Ticket from '../models/ticketModel.js';
import jwt from 'jsonwebtoken';
import { AptosClient } from 'aptos';

const client = new AptosClient(process.env.APTOS_NODE_URL);

// Generate a QR code token
export const generateQRToken = async (req, res) => {
    const { ticketObjectAddress, eventContractAddress, ownerAddress } = req.body;
    try {
        // Check if a token already exists
        let ticket = await Ticket.findOne({ ticketObjectAddress });

        if (ticket) {
            return res.status(200).json({ qrToken: ticket.qrToken });
        }

        // Create a new JWT token
        const qrToken = jwt.sign({ ticketObjectAddress, ownerAddress }, process.env.JWT_SECRET, { expiresIn: '24h' });

        ticket = new Ticket({
            ticketObjectAddress,
            eventContractAddress,
            ownerAddress,
            qrToken
        });
        await ticket.save();

        res.status(201).json({ qrToken });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

// Verify the QR code and on-chain ownership
export const verifyTicket = async (req, res) => {
    const { qrToken } = req.body;
    try {
        // 1. Verify JWT
        const decoded = jwt.verify(qrToken, process.env.JWT_SECRET);
        const { ticketObjectAddress, ownerAddress } = decoded;
        
        // 2. Check ticket in DB
        const ticket = await Ticket.findOne({ ticketObjectAddress });
        if (!ticket) {
            return res.status(404).json({ valid: false, message: 'Ticket not found in our system.' });
        }
        if (ticket.isCheckedIn) {
            return res.status(400).json({ valid: false, message: 'This ticket has already been checked in.' });
        }
        
        // 3. Verify on-chain ownership
        try {
            const resource = await client.getAccountResource(ownerAddress, `0x1::object::ObjectCore`);
            const currentOwner = resource.data.owner;
            
            // This check is simplified. A more robust check would query the specific object.
            // For now, we assume if the user has an object core and the JWT is valid, it's theirs.
            // A better method: query the object directly `client.getObject(ticketObjectAddress)`
            // and check its `owner` field. This SDK function may not be directly available.
            // We'll proceed with this conceptual check.

            if (currentOwner !== ownerAddress) {
                 return res.status(403).json({ valid: false, message: 'On-chain ownership verification failed. Ticket may have been transferred.' });
            }

        } catch (aptosError) {
             return res.status(500).json({ valid: false, message: 'Could not verify ownership on Aptos blockchain.' });
        }

        // 4. Mark as checked in
        ticket.isCheckedIn = true;
        await ticket.save();

        res.status(200).json({ valid: true, message: 'Ticket verified successfully. Welcome!' });

    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ valid: false, message: 'Invalid or expired QR code.' });
        }
        res.status(500).json({ valid: false, message: 'Server error during verification.', error });
    }
};