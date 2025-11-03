const express = require('express');
const { 
    createPublicKeyForUser, 
    listPublicKeysForUser, 
    updatePublicKey, 
    deletePublicKey 
} = require('../../services/publicApiKeyService');
const { authenticate: supabaseAuth } = require('../../middleware/supabaseAuth');

const router = express.Router();

/**
 * GET /api/v1/public-keys
 * List all public API keys for the authenticated user
 */
router.get('/', supabaseAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const keys = await listPublicKeysForUser(userId);
        
        res.json({ 
            success: true,
            public_keys: keys 
        });
    } catch (error) {
        console.error('Error listing public keys:', error);
        res.status(500).json({ 
            error: 'Failed to list public keys',
            details: error.message 
        });
    }
});

/**
 * POST /api/v1/public-keys
 * Create a new public API key
 */
router.post('/', supabaseAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, authorized_domains } = req.body;
        
        if (!name) {
            return res.status(400).json({ 
                error: 'Name is required',
                details: 'Please provide a name for the public key'
            });
        }
        
        // Validate authorized_domains if provided
        if (authorized_domains !== undefined && !Array.isArray(authorized_domains)) {
            return res.status(400).json({ 
                error: 'Invalid authorized_domains',
                details: 'authorized_domains must be an array of domain strings'
            });
        }
        
        const key = await createPublicKeyForUser(
            userId, 
            name, 
            authorized_domains || []
        );
        
        res.status(201).json({ 
            success: true,
            public_key: key 
        });
    } catch (error) {
        console.error('Error creating public key:', error);
        res.status(500).json({ 
            error: 'Failed to create public key',
            details: error.message 
        });
    }
});

/**
 * PUT /api/v1/public-keys/:id
 * Update a public API key (name, authorized_domains, or enabled status)
 */
router.put('/:id', supabaseAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const keyId = req.params.id;
        const { name, authorized_domains, enabled } = req.body;
        
        // Validate inputs
        const updates = {};
        
        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim().length === 0) {
                return res.status(400).json({ 
                    error: 'Invalid name',
                    details: 'Name must be a non-empty string'
                });
            }
            updates.name = name;
        }
        
        if (authorized_domains !== undefined) {
            if (!Array.isArray(authorized_domains)) {
                return res.status(400).json({ 
                    error: 'Invalid authorized_domains',
                    details: 'authorized_domains must be an array'
                });
            }
            updates.authorized_domains = authorized_domains;
        }
        
        if (enabled !== undefined) {
            if (typeof enabled !== 'boolean') {
                return res.status(400).json({ 
                    error: 'Invalid enabled value',
                    details: 'enabled must be a boolean'
                });
            }
            updates.enabled = enabled;
        }
        
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ 
                error: 'No updates provided',
                details: 'Provide at least one field to update (name, authorized_domains, or enabled)'
            });
        }
        
        const key = await updatePublicKey(keyId, userId, updates);
        
        if (!key) {
            return res.status(404).json({ 
                error: 'Public key not found',
                details: 'The specified public key does not exist or does not belong to you'
            });
        }
        
        res.json({ 
            success: true,
            public_key: key 
        });
    } catch (error) {
        console.error('Error updating public key:', error);
        res.status(500).json({ 
            error: 'Failed to update public key',
            details: error.message 
        });
    }
});

/**
 * DELETE /api/v1/public-keys/:id
 * Delete (disable) a public API key
 */
router.delete('/:id', supabaseAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const keyId = req.params.id;
        
        const key = await deletePublicKey(keyId, userId);
        
        if (!key) {
            return res.status(404).json({ 
                error: 'Public key not found',
                details: 'The specified public key does not exist or does not belong to you'
            });
        }
        
        res.json({ 
            success: true,
            message: 'Public key deleted successfully',
            public_key: key 
        });
    } catch (error) {
        console.error('Error deleting public key:', error);
        res.status(500).json({ 
            error: 'Failed to delete public key',
            details: error.message 
        });
    }
});

module.exports = router;

