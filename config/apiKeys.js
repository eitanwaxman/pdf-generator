// API Key configuration
// In production, this should be stored in a database
module.exports = {
    // Free tier - limited to 50 requests per day, includes watermark
    'test-free-key': { 
        tier: 'free', 
        name: 'Free Test Account' 
    },
    
    // Paid tier - unlimited requests, no watermark, priority queuing
    'test-paid-key': { 
        tier: 'paid', 
        name: 'Paid Test Account' 
    }
};

