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
import { NotificationService } from './services/notificationService.js';
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
    receivedBy: { type: String, enum: ['Balu', 'Mani'], required: true },
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
    transactionMode: { type: String, enum: ['Cash', 'UPI'], required: true },
    receivedBy: { type: String, enum: ['Balu', 'Mani'], required: true }
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
    refundDate: { type: Date, default: null },
    receivedBy: { type: String, enum: ['Balu', 'Mani'], required: true }
});

const ExpenseSchema = new mongoose.Schema({
    expenseType: { 
        type: String, 
        enum: [
            'Watchman 1',
            'Watchman 2',
            'Electricity Bill',
            'Wi-Fi',
            'Sweeper',
            'Telephone',
            'Water',
            'Miscellaneous'
        ],
        required: true 
    },
    spentBy: {
        type: String,
        enum: ['Balu', 'Mani'],
        required: true
    },
    description: { 
        type: String,
        required: function() { 
            return this.expenseType === 'Miscellaneous'; 
        }
    },
    amount: { 
        type: Number, 
        required: true 
    },
    transactionMode: { 
        type: String, 
        enum: ['Cash', 'UPI'], 
        required: true 
    },
    transactionDate: { 
        type: Date, 
        default: Date.now 
    },
    month: { type: Number, required: true },
    year: { type: Number, required: true }
});

// Add Balancesheet Schema
const BalancesheetSchema = new mongoose.Schema({
    userName: { 
        type: String, 
        enum: ['Balu', 'Mani'], 
        required: true 
    },
    amount: { 
        type: Number, 
        required: true 
    },
    date: { 
        type: Date, 
        default: Date.now 
    },
    month: { 
        type: Number, 
        required: true 
    },
    year: { 
        type: Number, 
        required: true 
    },
    type: { 
        type: String, 
        enum: ['normal', 'transfer'], 
        default: 'normal' 
    },
    description: { 
        type: String 
    }
});

const Revenue = mongoose.model('Revenue', RevenueSchema);
const Advance = mongoose.model('Advance', AdvanceSchema);
const Expense = mongoose.model('Expense', ExpenseSchema);
const Balancesheet = mongoose.model('Balancesheet', BalancesheetSchema);

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
    try {
        const currentDate = new Date();
        const result = await Vehicle.updateMany(
            { 
                endDate: { $lt: currentDate },
                status: 'active'
            },
            { 
                $set: { status: 'inactive' }
            }
        );
        console.log(`Updated ${result.modifiedCount} vehicles to inactive status`);
    } catch (error) {
        console.error('Error updating vehicle status:', error);
    }
};

// Instead of using setInterval, check status on every relevant API call
const checkVehicleStatus = async (req, res, next) => {
    try {
        await updateVehicleStatus();
        next();
    } catch (error) {
        console.error('Error in status check middleware:', error);
        next(); // Continue to the route handler even if status update fails
    }
};

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
                parkingType: vehicleData.parkingType,
                receivedBy: vehicleData.receivedBy
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
                transactionMode: vehicleData.transactionMode,
                receivedBy: vehicleData.receivedBy
            });
            await newRevenue.save();
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get All Vehicles
app.get('/vehicles', checkVehicleStatus, async (req, res) => {
    try {
        const vehicles = await Vehicle.find();
        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get All Advances for Analytics
app.get('/advances/all', async (req, res) => {
    try {
        const advances = await Advance.find();
        res.json(advances);
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
        const { status, transactionMode, rentPrice, receivedBy } = req.body;        
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        // Get the original end date from the database
        const originalEndDate = new Date(vehicle.endDate);
        
        // Calculate the last day of the next month after the original end date
        const nextMonthEndDate = new Date(originalEndDate.getFullYear(), originalEndDate.getMonth() + 2, 0);
        
        // Set the time to 23:59:59.999 in local timezone
        nextMonthEndDate.setHours(18, 29, 59, 999);

        // Update vehicle with existing receivedBy value
        const updatedVehicle = await Vehicle.findByIdAndUpdate(
            req.params.id,
            {
                status: status || 'active',
                endDate: nextMonthEndDate
            },
            { new: true }
        );

        // Create revenue record for monthly extension with new transaction details
        const extensionRevenue = new Revenue({
            vehicleNumber: vehicle.vehicleNumber,
            vehicleDescription: vehicle.vehicleDescription,
            lotNumber: vehicle.lotNumber,
            rentalType: vehicle.rentalType,
            rentPrice: vehicle.rentPrice,
            month: new Date().getMonth(),
            year: new Date().getFullYear(),
            revenueAmount: rentPrice !== undefined ? rentPrice : vehicle.rentPrice,
            transactionType: 'Extension',
            transactionMode: transactionMode,
            receivedBy: receivedBy
        });

        // Validate revenue record before saving
        const validationError = extensionRevenue.validateSync();
        if (validationError) {
            return res.status(400).json({ error: 'Invalid revenue data', details: validationError.message });
        }

        await extensionRevenue.save();

        res.json({ 
            success: true,
            vehicle: updatedVehicle,
            revenue: extensionRevenue
        });
    } catch (error) {
        console.error('Error in reactivateVehicle:', error);
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

        // Check if vehicle number is being changed
        const isVehicleNumberChanged = vehicleData.vehicleNumber && 
                                       vehicleData.vehicleNumber !== currentVehicle.vehicleNumber;

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

        // If vehicle number is changed, update all related advance and revenue records
        if (isVehicleNumberChanged) {
            const oldVehicleNumber = currentVehicle.vehicleNumber;
            const newVehicleNumber = vehicleData.vehicleNumber;

            // Update all advance records
            await Advance.updateMany(
                { vehicleNumber: oldVehicleNumber },
                { $set: { vehicleNumber: newVehicleNumber } }
            );

            // Update all revenue records
            await Revenue.updateMany(
                { vehicleNumber: oldVehicleNumber },
                { $set: { vehicleNumber: newVehicleNumber } }
            );

            console.log(`Updated vehicle number from ${oldVehicleNumber} to ${newVehicleNumber} in all related records`);
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
        const { additionalDays, transactionMode, receivedBy } = req.body;
        const vehicle = await Vehicle.findById(req.params.id);
        
        if (!vehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        let newEndDate;
        if (vehicle.rentalType === 'daily') {
            const currentEndDate = new Date(vehicle.endDate);
            newEndDate = new Date(currentEndDate);
            newEndDate.setDate(currentEndDate.getDate() + Number(additionalDays));
            newEndDate.setHours(18, 29, 59, 999);
            vehicle.endDate = newEndDate;
            vehicle.numberOfDays += Number(additionalDays);

            // Compare newEndDate with current date to determine status
            const currentDate = new Date();
            vehicle.status = newEndDate > currentDate ? 'active' : 'inactive';

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
                transactionMode: transactionMode,
                receivedBy: receivedBy  // Use the receivedBy from request body
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
app.get('/vehicleStats', checkVehicleStatus, async (req, res) => {
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

// Update revenue transaction
app.put('/revenue/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { transactionDate, transactionMode, receivedBy, revenueAmount } = req.body;

        const updateData = {
            transactionDate: new Date(transactionDate),
            transactionMode,
            receivedBy,
            revenueAmount: parseFloat(revenueAmount),
            month: new Date(transactionDate).getMonth(),
            year: new Date(transactionDate).getFullYear()
        };

        const updatedRevenue = await Revenue.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedRevenue) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.json({ 
            success: true, 
            message: 'Transaction updated successfully',
            transaction: updatedRevenue 
        });
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            message: 'Failed to update transaction' 
        });
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
        const totalAmount = await calculateTotalAdvance(month, year);
        res.json({ totalAmount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// New endpoint for getting all advances up to a specific date
app.get('/advances/allUpToDate', async (req, res) => {
    try {
        const { date } = req.query;
        const queryDate = new Date(date);

        // First, get all advance payments made up to the query date (excluding refund records)
        const advances = await Advance.find({
            startDate: { $lte: queryDate },
            advanceAmount: { $gte: 0 },  // Get all advance amounts including zero
            $or: [
                { advanceRefund: null },
                { advanceRefund: { $exists: false } }
            ]
        });

        // Then, get all refunds made up to the query date
        const refunds = await Advance.find({
            refundDate: { $lte: queryDate },
            advanceRefund: { $gte: 0 }  // Get all refunds including zero
        });

        // Combine both sets of records
        const allRecords = [...advances, ...refunds];

        // Sort by date for consistency
        allRecords.sort((a, b) => {
            const dateA = a.refundDate || a.startDate;
            const dateB = b.refundDate || b.startDate;
            return dateB - dateA;
        });

        res.json(allRecords);
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

        // IMPORTANT:
        // We intentionally separate "advance payments" and "refunds" so that
        // refund documents are ONLY included in the month of the refund, and
        // not also in the month of the original startDate. Refund documents
        // carry the original startDate for traceability, so filtering by
        // startDate alone would incorrectly surface them in the original month.
        const advances = await Advance.find({
            $or: [
                // Include advance payments (including zero amounts) whose startDate falls in the month (but not refund records)
                {
                    advanceAmount: { $gte: 0 },
                    startDate: { $gte: startOfMonth, $lte: endOfMonth },
                    $or: [
                        { advanceRefund: null },
                        { advanceRefund: { $exists: false } }
                    ]
                },
                // Include refunds (including zero amounts) whose refundDate falls in the month
                {
                    advanceRefund: { $gte: 0 },
                    refundDate: { $gte: startOfMonth, $lte: endOfMonth }
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
            refundDate: new Date(),
            receivedBy: originalAdvance.receivedBy
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
        const { advanceAmount, transactionMode, receivedBy } = req.body;

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
            refundDate: null,
            receivedBy: receivedBy
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
app.get('/vehicles/search', checkVehicleStatus, async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            const vehicles = await Vehicle.find({ 
                advanceAmount: 0
            });
            return res.json(vehicles);
        }

        const vehicles = await Vehicle.find({
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

// Add new expense
app.post('/expenses', async (req, res) => {
    try {
        const expenseData = {
            ...req.body,
            month: new Date(req.body.transactionDate).getMonth(),
            year: new Date(req.body.transactionDate).getFullYear()
        };
        const newExpense = new Expense(expenseData);
        await newExpense.save();
        res.json({ success: true, expense: newExpense });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get expenses with optional month/year filter
app.get('/expenses', async (req, res) => {
    try {
        const { month, year } = req.query;
        const query = {};
        
        if (month !== undefined) query.month = parseInt(month);
        if (year !== undefined) query.year = parseInt(year);

        const expenses = await Expense.find(query).sort({ transactionDate: -1 });
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get expense statistics
app.get('/expenses/stats', async (req, res) => {
    try {
        const { month, year } = req.query;
        const query = {};
        
        if (month !== undefined) query.month = parseInt(month);
        if (year !== undefined) query.year = parseInt(year);

        const stats = await Expense.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$spentBy',
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete expense
app.delete('/expenses/:id', async (req, res) => {
    try {
        const deletedExpense = await Expense.findByIdAndDelete(req.params.id);
        if (!deletedExpense) {
            return res.status(404).json({ error: 'Expense not found' });
        }
        res.json({ 
            success: true, 
            message: 'Expense deleted successfully',
            expense: deletedExpense 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add Balancesheet endpoints
app.post('/balancesheet', async (req, res) => {
    try {
        const balanceData = req.body;
        const newBalance = new Balancesheet(balanceData);
        await newBalance.save();
        res.json({ success: true, balance: newBalance });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add PUT endpoint for updating balance sheet records
app.put('/balancesheet/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        const updatedBalance = await Balancesheet.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedBalance) {
            return res.status(404).json({ error: 'Balance sheet record not found' });
        }

        res.json({ success: true, balance: updatedBalance });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/balancesheet', async (req, res) => {
    try {
        const { month, year } = req.query;
        const query = {};
        
        if (month !== undefined) query.month = parseInt(month);
        if (year !== undefined) query.year = parseInt(year);

        const balancesheet = await Balancesheet.find(query).sort({ date: -1 });
        res.json(balancesheet);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// New endpoint to send payment reminder to individual vehicle owner
app.post('/notifications/send-payment-reminder', async (req, res) => {
    try {
        const { vehicleNumber, ownerName, contactNumber, amount, dueDate } = req.body;

        // Format the phone number to include country code if not present
        const formattedNumber = contactNumber.startsWith('+') 
            ? '9842138883'
            : `+919842138883`; // Adding India's country code

        const result = await NotificationService.sendPaymentReminder(
            vehicleNumber,
            ownerName,
            formattedNumber,
            amount,
            dueDate
        );

        res.json({ success: result });
    } catch (error) {
        console.error('Notification Error:', error);
        res.status(500).json({ 
            error: error.message,
            details: 'Failed to send notification. Please check Twilio credentials and phone number format.'
        });
    }
});

// Add this endpoint after the other revenue endpoints
app.post('/revenue', async (req, res) => {
    try {
        const revenueData = req.body;
        const newRevenue = new Revenue(revenueData);
        await newRevenue.save();
        res.json({ success: true, revenue: newRevenue });
    } catch (error) {
        console.error('Error adding revenue:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add Balancesheet endpoints
app.post('/balancesheet/transfer', async (req, res) => {
    try {
        const { fromUser, toUser, amount, date, month, year } = req.body;
        if (!fromUser || !toUser || !amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        // Deduct from sender
        const senderRecord = new Balancesheet({
            userName: fromUser,
            amount: -Math.abs(amount),
            date: date || new Date(),
            month: month !== undefined ? month : new Date().getMonth(),
            year: year !== undefined ? year : new Date().getFullYear(),
            type: 'transfer',
            description: `Transfer to ${toUser}`
        });
        // Add to receiver
        const receiverRecord = new Balancesheet({
            userName: toUser,
            amount: Math.abs(amount),
            date: date || new Date(),
            month: month !== undefined ? month : new Date().getMonth(),
            year: year !== undefined ? year : new Date().getFullYear(),
            type: 'transfer',
            description: `Received from ${fromUser}`
        });
        await senderRecord.save();
        await receiverRecord.save();
        res.json({ success: true, sender: senderRecord, receiver: receiverRecord });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(5000, () => console.log('Server running on port 5000'));
