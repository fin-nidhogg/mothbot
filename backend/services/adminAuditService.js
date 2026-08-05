const AdminAuditLog = require('../models/AdminAuditLog');

async function writeAdminAudit(req, action, targetType, targetId, metadata) {
    try {
        await AdminAuditLog.create({
            actorId: req.adminUser._id,
            actorUsername: req.adminUser.username,
            action,
            targetType,
            targetId,
            metadata,
            ip: req.ip,
        });
    } catch (error) {
        console.error('Failed to persist admin audit event:', error);
    }
}

module.exports = { writeAdminAudit };
