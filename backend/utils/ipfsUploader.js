import axios from 'axios';
import FormData from 'form-data';

export const uploadJSONToIPFS = async (jsonData) => {
  const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;
  try {
    const response = await axios.post(url, jsonData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PINATA_JWT}`,
      },
    });
    return `ipfs://${response.data.IpfsHash}`;
  } catch (error) {
    console.error('Error uploading JSON to IPFS:', error);
    throw new Error('Failed to upload JSON to IPFS');
  }
};

export const uploadFileToIPFS = async (file) => {
  const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
  let data = new FormData();
  data.append('file', file.buffer, { filename: file.originalname });
  
  try {
    const response = await axios.post(url, data, {
      headers: {
        ...data.getHeaders(),
        'Authorization': `Bearer ${process.env.PINATA_JWT}`,
      },
    });
    return `ipfs://${response.data.IpfsHash}`;
  } catch (error) {
    console.error('Error uploading file to IPFS:', error);
    throw new Error('Failed to upload file to IPFS');
  }
};