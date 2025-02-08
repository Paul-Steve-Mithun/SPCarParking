import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
app.use(cors());

app.use(bodyParser.json());

mongoose
  .connect(process.env.MONGODB_URI, {
    dbName: process.env.Db_name,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Error connecting to MongoDB:", err));

const VehicleSchema = new mongoose.Schema({
    vehicleNumber: { type: String, required: true },
    vehicleDescription: { type: String },
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
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
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
    transactionType: { type: String, enum: ['New', 'Extension'], required: true }
});

const Revenue = mongoose.model('Revenue', RevenueSchema);

// Updated pre-save middleware to handle end dates correctly
VehicleSchema.pre('save', function(next) {
    if (this.isNew || this.isModified('startDate') || this.isModified('numberOfDays')) {
        const startDate = new Date(this.startDate);
        
        if (this.rentalType === 'monthly') {
            // Get the last day of the current month
            const lastDay = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
            // Set time to end of day (23:59:59.999)
            lastDay.setHours(23, 59, 59, 999);
            this.endDate = lastDay;
        } else if (this.rentalType === 'daily' && this.numberOfDays) {
            // For daily rentals, set end date to midnight of the last day
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + this.numberOfDays - 1); // Subtract 1 because the start day counts as day 1
            endDate.setHours(23, 59, 59, 999);
            this.endDate = endDate;
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


// Update your addVehicle endpoint
app.post('/addVehicle', async (req, res) => {
    try {
        const newVehicle = new Vehicle({
            ...req.body,
            status: 'active',
            startDate: new Date()
        });
        await newVehicle.save();

        // Calculate revenue amount
        const revenueAmount = req.body.rentalType === 'daily' 
            ? req.body.rentPrice * req.body.numberOfDays
            : req.body.rentPrice;

        // Add revenue record
        const newRevenue = new Revenue({
            vehicleNumber: req.body.vehicleNumber,
            vehicleDescription: req.body.vehicleDescription,
            lotNumber: req.body.lotNumber,
            rentalType: req.body.rentalType,
            rentPrice: req.body.rentPrice,
            numberOfDays: req.body.numberOfDays,
            month: new Date().getMonth(),
            year: new Date().getFullYear(),
            revenueAmount: revenueAmount,
            transactionType: 'New'
        });
        await newRevenue.save();

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

// Remove Vehicle
app.delete('/removeVehicle/:id', async (req, res) => {
    try {
        await Vehicle.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Updated reactivateVehicle endpoint to handle end dates correctly
app.put('/reactivateVehicle/:id', async (req, res) => {
    try {
        const { status } = req.body;
        const currentDate = new Date();
        
        // Get the last day of the next month
        const lastDayNextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);
        lastDayNextMonth.setHours(23, 59, 59, 999);
        
        // Calculate the number of days being added
        const daysDifference = Math.ceil((lastDayNextMonth - currentDate) / (1000 * 60 * 60 * 24));
        
        const vehicle = await Vehicle.findByIdAndUpdate(
            req.params.id, 
            { 
                status: status || 'active', 
                endDate: lastDayNextMonth,
                $inc: { additionalDays: daysDifference }
            }, 
            { new: true }
        );

        if (!vehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        res.json(vehicle);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Vehicle
app.put('/updateVehicle/:id', async (req, res) => {
    try {
        // Remove startDate and endDate from the update data to preserve original dates
        const { startDate, endDate, ...updateData } = req.body;

        const vehicle = await Vehicle.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!vehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        res.json({ success: true, vehicle });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update your extendRental endpoint
app.put('/extendRental/:id', async (req, res) => {
    try {
        const { additionalDays } = req.body;
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

            // Add revenue record for extension
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
                transactionType: 'Extension'
            });
            await extensionRevenue.save();
        } else {
            // For monthly rentals
            const currentEndDate = new Date(vehicle.endDate);
            newEndDate = new Date(currentEndDate.getFullYear(), currentEndDate.getMonth() + 1, 0);
            newEndDate.setHours(23, 59, 59, 999);
            vehicle.endDate = newEndDate;
            vehicle.status = 'active';

            // Add revenue record for monthly extension
            const extensionRevenue = new Revenue({
                vehicleNumber: vehicle.vehicleNumber,
                vehicleDescription: vehicle.vehicleDescription,
                lotNumber: vehicle.lotNumber,
                rentalType: vehicle.rentalType,
                rentPrice: vehicle.rentPrice,
                month: new Date().getMonth(),
                year: new Date().getFullYear(),
                revenueAmount: vehicle.rentPrice,
                transactionType: 'Extension'
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

app.listen(5000, () => console.log('Server running on port 5000'));