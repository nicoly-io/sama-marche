const supabase = require('../config/supabase');

const logSecurityEvent = async (eventType, userId, req, isSuspicious = false, details = null) => {
    try {
        const { data, error } = await supabase
            .from('security_logs')
            .insert({
                user_id: userId,
                event_type: eventType,
                ip_address: req.ip || req.connection.remoteAddress,
                user_agent: req.headers['user-agent'],
                is_suspicious: isSuspicious,
                details: details || {}
            });
        
        if (error) console.error('Error logging security event:', error);
    } catch (error) {
        console.error('Security log error:', error);
    }
};

const detectSuspiciousActivity = async (userId, req) => {
    try {
        // Vérifier les connexions depuis plusieurs IPs en peu de temps
        const { data: recentLogs, error } = await supabase
            .from('security_logs')
            .select('ip_address')
            .eq('user_id', userId)
            .eq('event_type', 'LOGIN_SUCCESS')
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
        
        if (recentLogs && recentLogs.length > 0) {
            const uniqueIPs = [...new Set(recentLogs.map(log => log.ip_address))];
            if (uniqueIPs.length > 3) {
                // Plus de 3 IPs différentes en 24h → suspect
                await logSecurityEvent('SUSPICIOUS_ACTIVITY', userId, req, true, {
                    reason: 'Multiple IPs in 24h',
                    ip_count: uniqueIPs.length
                });
                return true;
            }
        }
    } catch (error) {
        console.error('Suspicious activity detection error:', error);
    }
    return false;
};

module.exports = { logSecurityEvent, detectSuspiciousActivity };