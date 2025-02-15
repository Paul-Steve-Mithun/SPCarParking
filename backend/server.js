import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
// Load environment variables
dotenv.config();

const app = express();
app.use(cors());

app.use(bodyParser.json());

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'vehicle-parking',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
        transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
    }
});

const upload = multer({ storage: storage });

// Helper function to delete file
async function deleteFile(filename) {
    if (!filename) return;
    
    try {
        await fs.unlink(path.join(__dirname, 'uploads', filename));
    } catch (error) {
        console.error('Error deleting file:', error);
        // Don't throw error if file doesn't exist
    }
}

mongoose
  .connect(process.env.MONGODB_URI, {
    dbName: process.env.Db_name,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Error connecting to MongoDB:", err));

// Update VehicleSchema to store Cloudinary URLs
const VehicleSchema = new mongoose.Schema({
    vehicleNumber: { type: String, required: true },
    vehicleDescription: { type: String },
    vehicleType: { type: String, enum: ['own', 'tboard'], required: true },
    lotNumber: { type: String},
    ownerName: { type: String, required: true },
    contactNumber: { type: String, required: true },
    parkingType: { type: String, enum: ['private', 'open'], required: true },
    rentalType: { type: String, enum: ['monthly', 'daily'], required: true },
    rentPrice: { type: Number, required: true },
    numberOfDays: { type: Number, default: null },
    advanceAmount: { type: Number, default: 5000 },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    additionalDays: {type: Number},
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    transactionMode: { type: String, enum: ['Cash', 'UPI'], default: 'Cash' },
    vehicleImage: { 
        url: String,
        public_id: String
    },
    document1Image: {
        url: String,
        public_id: String
    },
    document2Image: {
        url: String,
        public_id: String
    }
});

const RevenueSchema = new mongoose.Schema({
    vehicleNumber: { type: String, required: true },
    vehicleDescription: { type: String },
    lotNumber: { type: String },
    rentalType: { type: String, enum: ['monthly', 'daily'], required: true },
    rentPrice: { type: Number, required: true },
    numberOfDays: { type: Number },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    revenueAmount: { type: Number, required: true },
    transactionDate: { type: Date, default: Date.now },
    transactionType: { type: String, enum: ['New', 'Extension'], required: true },
    transactionMode: { type: String, enum: ['Cash', 'UPI'], required: true }
});

const AdvanceSchema = new mongoose.Schema({
    vehicleNumber: { type: String, required: true },
    vehicleDescription: { type: String },
    lotNumber: { type: String },
    transactionMode: { type: String, enum: ['Cash', 'UPI'], required: true },
    startDate: { type: Date, default: Date.now },
    advanceAmount: { type: Number, required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    parkingType: { type: String, enum: ['private', 'open'], required: true },
    advanceRefund: { type: Number, default: null },
    refundDate: { type: Date, default: null }
});

const Revenue = mongoose.model('Revenue', RevenueSchema);
const Advance = mongoose.model('Advance', AdvanceSchema);

// Update VehicleSchema pre-save middleware
VehicleSchema.pre('save', function(next) {
    if (this.isNew || this.isModified('startDate') || this.isModified('numberOfDays')) {
        const startDate = new Date(this.startDate);
        
        // Helper function to set standard end time (18:29:59.999 UTC = 23:59:59.999 IST)
        const setStandardEndTime = (date) => {
            const d = new Date(date);
            d.setUTCHours(18, 29, 59, 999);
            return d;
        };
        
        if (this.rentalType === 'monthly') {
            // Get the last day of the current month
            const lastDay = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
            this.endDate = setStandardEndTime(lastDay);
        } else if (this.rentalType === 'daily' && this.numberOfDays) {
            // For daily rentals, set end date to standard time of the last day
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + this.numberOfDays - 1); // Subtract 1 because start day counts as day 1
            this.endDate = setStandardEndTime(endDate);
        }
    }
    next();
});

const Vehicle = mongoose.model('Vehicle', VehicleSchema);

// Function to update vehicle status
const updateVehicleStatus = async () => {
    const currentDate = new Date();
    await Vehicle.updateMany(
        { 
            endDate: { $lt: currentDate },
            status: 'active'
        },
        { 
            $set: { status: 'inactive' }
        }
    );
};

// Run status update every hour
setInterval(updateVehicleStatus, 1000 * 60 * 60 );

app.get('/', (req, res) => {
    res.send('SP Car Parking');
});

// Update addVehicle endpoint
app.post('/addVehicle', upload.fields([
    { name: 'vehicleImage', maxCount: 1 },
    { name: 'document1Image', maxCount: 1 },
    { name: 'document2Image', maxCount: 1 }
]), async (req, res) => {
    try {
        const vehicleData = JSON.parse(req.body.vehicleData);
        
        // Add image data to vehicle data
        if (req.files) {
            if (req.files.vehicleImage) {
                vehicleData.vehicleImage = {
                    url: req.files.vehicleImage[0].path,
                    public_id: req.files.vehicleImage[0].filename
                };
            }
            if (req.files.document1Image) {
                vehicleData.document1Image = {
                    url: req.files.document1Image[0].path,
                    public_id: req.files.document1Image[0].filename
                };
            }
            if (req.files.document2Image) {
                vehicleData.document2Image = {
                    url: req.files.document2Image[0].path,
                    public_id: req.files.document2Image[0].filename
                };
            }
        }

        // Set standard end time for the day (18:29:59.999 UTC = 23:59:59.999 IST)
        const setStandardEndTime = (date) => {
            const d = new Date(date);
            d.setUTCHours(18, 29, 59, 999);
            return d;
        };

        // Handle special case for daily rental with 0 days
        const isZeroDayDaily = vehicleData.rentalType === 'daily' && Number(vehicleData.numberOfDays) === 0;
        
        // For zero-day daily rentals, set end date to previous day with standard time
        let endDate;
        if (isZeroDayDaily) {
            const previousDay = new Date();
            previousDay.setDate(previousDay.getDate() - 1);
            endDate = setStandardEndTime(previousDay);
        }

        const newVehicle = new Vehicle({
            ...vehicleData,
            status: isZeroDayDaily ? 'inactive' : 'active',
            startDate: new Date(),
            endDate: endDate // Will be handled by schema for monthly and normal daily rentals
        });
        await newVehicle.save();

        // Create advance record for monthly rentals
        if (vehicleData.rentalType === 'monthly') {
            const newAdvance = new Advance({
                vehicleNumber: vehicleData.vehicleNumber,
                vehicleDescription: vehicleData.vehicleDescription,
                lotNumber: vehicleData.lotNumber,
                transactionMode: vehicleData.transactionMode,
                startDate: new Date(),
                advanceAmount: vehicleData.advanceAmount,
                month: new Date().getMonth(),
                year: new Date().getFullYear(),
                parkingType: vehicleData.parkingType
            });
            await newAdvance.save();
        }

        // Create revenue record only for daily rentals with days > 0
        if (vehicleData.rentalType === 'daily' && Number(vehicleData.numberOfDays) > 0) {
            const newRevenue = new Revenue({
                vehicleNumber: vehicleData.vehicleNumber,
                vehicleDescription: vehicleData.vehicleDescription,
                lotNumber: vehicleData.lotNumber,
                rentalType: vehicleData.rentalType,
                rentPrice: vehicleData.rentPrice,
                numberOfDays: vehicleData.numberOfDays,
                month: new Date().getMonth(),
                year: new Date().getFullYear(),
                revenueAmount: vehicleData.rentPrice * vehicleData.numberOfDays,
                transactionType: 'New',
                transactionMode: vehicleData.transactionMode
            });
            await newRevenue.save();
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get All Vehicles
app.get('/vehicles', async (req, res) => {
    try {
        const vehicles = await Vehicle.find();
        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update the delete vehicle endpoint
app.delete('/removeVehicle/:id', async (req, res) => {
    try {
        // First get the vehicle to access its image public_ids
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }

        // Delete images from Cloudinary if they exist
        const imagesToDelete = [
            vehicle.vehicleImage?.public_id,
            vehicle.document1Image?.public_id,
            vehicle.document2Image?.public_id
        ].filter(Boolean); // Remove null/undefined values

        // Delete all images from Cloudinary
        for (const public_id of imagesToDelete) {
            await cloudinary.uploader.destroy(public_id);
        }

        // Then delete the vehicle from database
        await Vehicle.findByIdAndDelete(req.params.id);

        res.json({ message: 'Vehicle deleted successfully' });
    } catch (error) {
        console.error('Error deleting vehicle:', error);
        res.status(500).json({ message: 'Error deleting vehicle', error: error.message });
    }
});

// Updated reactivateVehicle endpoint
app.put('/reactivateVehicle/:id', async (req, res) => {
    try {
        const { status, transactionMode, rentPrice } = req.body;
        const currentDate = new Date();
        
        const lastDayNextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);
        lastDayNextMonth.setHours(23, 59, 59, 999);
        
        const daysDifference = Math.ceil((lastDayNextMonth - currentDate) / (1000 * 60 * 60 * 24));
        
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        // Update vehicle
        vehicle.status = status || 'active';
        vehicle.endDate = lastDayNextMonth;
        vehicle.additionalDays = (vehicle.additionalDays || 0) + daysDifference;
        await vehicle.save();

        // Create revenue record for monthly extension
        const extensionRevenue = new Revenue({
            vehicleNumber: vehicle.vehicleNumber,
            vehicleDescription: vehicle.vehicleDescription,
            lotNumber: vehicle.lotNumber,
            rentalType: vehicle.rentalType,
            rentPrice: rentPrice || vehicle.rentPrice,
            month: new Date().getMonth(),
            year: new Date().getFullYear(),
            revenueAmount: rentPrice || vehicle.rentPrice,
            transactionType: 'Extension',
            transactionMode: transactionMode
        });
        await extensionRevenue.save();

        res.json(vehicle);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/updateVehicle/:id', upload.fields([
    { name: 'vehicleImage', maxCount: 1 },
    { name: 'document1Image', maxCount: 1 },
    { name: 'document2Image', maxCount: 1 }
]), async (req, res) => {
    try {
        const vehicleData = JSON.parse(req.body.vehicleData);
        const currentVehicle = await Vehicle.findById(req.params.id);
        
        if (!currentVehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        // Handle image updates
        if (req.files) {
            // Vehicle Image
            if (req.files.vehicleImage) {
                // Delete old image from Cloudinary if exists
                if (currentVehicle.vehicleImage?.public_id) {
                    await cloudinary.uploader.destroy(currentVehicle.vehicleImage.public_id);
                }
                vehicleData.vehicleImage = {
                    url: req.files.vehicleImage[0].path,
                    public_id: req.files.vehicleImage[0].filename
                };
            }

            // Document 1 Image
            if (req.files.document1Image) {
                if (currentVehicle.document1Image?.public_id) {
                    await cloudinary.uploader.destroy(currentVehicle.document1Image.public_id);
                }
                vehicleData.document1Image = {
                    url: req.files.document1Image[0].path,
                    public_id: req.files.document1Image[0].filename
                };
            }

            // Document 2 Image
            if (req.files.document2Image) {
                if (currentVehicle.document2Image?.public_id) {
                    await cloudinary.uploader.destroy(currentVehicle.document2Image.public_id);
                }
                vehicleData.document2Image = {
                    url: req.files.document2Image[0].path,
                    public_id: req.files.document2Image[0].filename
                };
            }
        }

        // Handle image removals
        if (vehicleData.removeImages) {
            if (vehicleData.removeImages.includes('vehicleImage') && currentVehicle.vehicleImage?.public_id) {
                await cloudinary.uploader.destroy(currentVehicle.vehicleImage.public_id);
                vehicleData.vehicleImage = null;
            }
            if (vehicleData.removeImages.includes('document1Image') && currentVehicle.document1Image?.public_id) {
                await cloudinary.uploader.destroy(currentVehicle.document1Image.public_id);
                vehicleData.document1Image = null;
            }
            if (vehicleData.removeImages.includes('document2Image') && currentVehicle.document2Image?.public_id) {
                await cloudinary.uploader.destroy(currentVehicle.document2Image.public_id);
                vehicleData.document2Image = null;
            }
            delete vehicleData.removeImages;
        }

        // Remove startDate and endDate from the update data to preserve original dates
        const { startDate, endDate, ...updateData } = vehicleData;

        const updatedVehicle = await Vehicle.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        res.json({ success: true, vehicle: updatedVehicle });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update the extendRental endpoint
app.put('/extendRental/:id', async (req, res) => {
    try {
        const { additionalDays, transactionMode } = req.body;
        const vehicle = await Vehicle.findById(req.params.id);
        
        if (!vehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        let newEndDate;
        if (vehicle.rentalType === 'daily') {
            const currentEndDate = new Date(vehicle.endDate);
            newEndDate = new Date(currentEndDate);
            newEndDate.setDate(currentEndDate.getDate() + Number(additionalDays));
            newEndDate.setHours(23, 59, 59, 999);
            vehicle.endDate = newEndDate;
            vehicle.numberOfDays += Number(additionalDays);
            vehicle.status = 'active';

            // Add revenue record for daily extension
            const extensionRevenue = new Revenue({
                vehicleNumber: vehicle.vehicleNumber,
                vehicleDescription: vehicle.vehicleDescription,
                lotNumber: vehicle.lotNumber,
                rentalType: vehicle.rentalType,
                rentPrice: vehicle.rentPrice,
                numberOfDays: Number(additionalDays),
                month: new Date().getMonth(),
                year: new Date().getFullYear(),
                revenueAmount: vehicle.rentPrice * Number(additionalDays),
                transactionType: 'Extension',
                transactionMode: transactionMode
            });
            await extensionRevenue.save();
        }

        await vehicle.save();
        res.json({ success: true, vehicle });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Vehicle Status Statistics
app.get('/vehicleStats', async (req, res) => {
    try {
        const stats = await Vehicle.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add new endpoint to get revenue data
app.get('/revenue', async (req, res) => {
    try {
        const { month, year } = req.query;
        const query = {};
        
        if (month !== undefined) query.month = parseInt(month);
        if (year !== undefined) query.year = parseInt(year);

        const revenue = await Revenue.find(query);
        res.json(revenue);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add endpoint to get revenue statistics
app.get('/revenueStats', async (req, res) => {
    try {
        const { month, year } = req.query;
        const query = {};
        
        if (month !== undefined) query.month = parseInt(month);
        if (year !== undefined) query.year = parseInt(year);

        const stats = await Revenue.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$rentalType',
                    totalRevenue: { $sum: '$revenueAmount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete Revenue Transaction
app.delete('/revenue/:id', async (req, res) => {
    try {
        const deletedRevenue = await Revenue.findByIdAndDelete(req.params.id);
        
        if (!deletedRevenue) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.json({ 
            success: true, 
            message: 'Transaction deleted successfully',
            deletedTransaction: deletedRevenue 
        });
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            message: 'Failed to delete transaction' 
        });
    }
});

// Update the total advances endpoint to consider date filters
app.get('/advances/total', async (req, res) => {
    try {
        const { month, year } = req.query;
        const endDate = new Date(year, parseInt(month) + 1, 0, 23, 59, 59);

        const result = await Advance.aggregate([
            {
                $match: {
                    $or: [
                        {
                            startDate: { $lte: endDate }
                        },
                        {
                            refundDate: { $lte: endDate }
                        }
                    ]
                }
            },
            {
                $group: {
                    _id: null,
                    totalAdvance: { $sum: '$advanceAmount' },
                    totalRefund: { 
                        $sum: { 
                            $cond: [
                                { $ne: ['$advanceRefund', null] },
                                '$advanceRefund',
                                0
                            ]
                        } 
                    },
                    incomingCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: [{ $month: '$startDate' }, parseInt(month) + 1] },
                                        { $eq: [{ $year: '$startDate' }, parseInt(year)] },
                                        { $eq: ['$advanceRefund', null] },  // Only count records without refund
                                        { $gt: ['$advanceAmount', 0] }      // Only count records with advance amount
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    outgoingCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: [{ $month: '$refundDate' }, parseInt(month) + 1] },
                                        { $eq: [{ $year: '$refundDate' }, parseInt(year)] },
                                        { $ne: ['$advanceRefund', null] }   // Only count records with refund
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);
        
        const totals = result.length > 0 ? {
            totalAmount: result[0].totalAdvance - result[0].totalRefund,
            totalAdvance: result[0].totalAdvance,
            totalRefund: result[0].totalRefund,
            incomingCount: result[0].incomingCount,
            outgoingCount: result[0].outgoingCount
        } : {
            totalAmount: 0,
            totalAdvance: 0,
            totalRefund: 0,
            incomingCount: 0,
            outgoingCount: 0
        };
        
        res.json(totals);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update the advances endpoint to include refund information
app.get('/advances', async (req, res) => {
    try {
        const { month, year } = req.query;
        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, parseInt(month) + 1, 0, 23, 59, 59);

        const advances = await Advance.find({
            $or: [
                {
                    startDate: {
                        $gte: startOfMonth,
                        $lte: endOfMonth
                    }
                },
                {
                    refundDate: {
                        $gte: startOfMonth,
                        $lte: endOfMonth
                    }
                }
            ]
        });

        res.json(advances);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update the endpoint to create new refund record
app.put('/advances/refund/:vehicleNumber', async (req, res) => {
    try {
        const { vehicleNumber } = req.params;
        const { advanceRefund } = req.body;

        // First find the original advance record
        const originalAdvance = await Advance.findOne({ 
            vehicleNumber,
            advanceRefund: null // Get the non-refunded record
        });

        if (!originalAdvance) {
            return res.status(404).json({ error: 'Advance record not found or already refunded' });
        }

        // Create a new advance record for the refund
        const refundAdvance = new Advance({
            vehicleNumber: originalAdvance.vehicleNumber,
            vehicleDescription: originalAdvance.vehicleDescription,
            lotNumber: originalAdvance.lotNumber,
            transactionMode: 'UPI',
            parkingType: originalAdvance.parkingType,
            startDate: originalAdvance.startDate,
            advanceAmount: 0, // Set to 0 since this is a refund record
            month: new Date().getMonth(),
            year: new Date().getFullYear(),
            advanceRefund: advanceRefund,
            refundDate: new Date()
        });

        await refundAdvance.save();

        res.json({ success: true, advance: refundAdvance });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add this new endpoint to get vehicles with zero advance
app.get('/vehicles/zero-advance', async (req, res) => {
    try {
        const vehicles = await Vehicle.find({ 
            advanceAmount: 0,
            status: 'active'
        });
        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update the endpoint to update advance amount
app.put('/vehicles/update-advance/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { advanceAmount, transactionMode } = req.body;

        // First get the current vehicle to check existing advance
        const currentVehicle = await Vehicle.findById(id);
        if (!currentVehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        // Calculate total advance by adding new amount to existing advance
        const totalAdvanceAmount = Number(currentVehicle.advanceAmount) + Number(advanceAmount);

        // Update vehicle with total advance
        const vehicle = await Vehicle.findByIdAndUpdate(
            id,
            { advanceAmount: totalAdvanceAmount },
            { new: true }
        );

        // Create advance record for the new payment only
        const newAdvance = new Advance({
            vehicleNumber: vehicle.vehicleNumber,
            vehicleDescription: vehicle.vehicleDescription,
            lotNumber: vehicle.lotNumber,
            transactionMode: transactionMode,
            startDate: new Date(),
            advanceAmount: advanceAmount, // Record only the new payment amount
            month: new Date().getMonth(),
            year: new Date().getFullYear(),
            parkingType: vehicle.parkingType,
            advanceRefund: null,
            refundDate: null
        });

        await newAdvance.save();

        res.json({ 
            success: true, 
            vehicle, 
            advance: newAdvance,
            message: `Added ₹${advanceAmount} to existing advance of ₹${currentVehicle.advanceAmount}`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update the endpoint to search all vehicles
app.get('/vehicles/search', async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            // If no search query, return only zero advance vehicles
            const vehicles = await Vehicle.find({ 
                advanceAmount: 0,
                status: 'active'
            });
            return res.json(vehicles);
        }

        // If there's a search query, search all active vehicles
        const vehicles = await Vehicle.find({
            status: 'active',
            $or: [
                { vehicleNumber: new RegExp(query.toUpperCase(), 'i') },
                { vehicleDescription: new RegExp(query.toUpperCase(), 'i') },
                { ownerName: new RegExp(query.toUpperCase(), 'i') }
            ]
        });
        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(5000, () => console.log('Server running on port 5000'));