/**
 * Bites2Bytes - Supabase Configuration
 * Centralized client for database and authentication
 */

// Load Supabase via CDN (ensure this script is included before other scripts in HTML)
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

const SUPABASE_URL = 'https://ghrkcyqtnncshpoqxkmj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_8GodJfaZr0uk_1vw1-uNYg_si5p74xN';

// Define the global object immediately
window.B2B_Supabase = {
    client: null,
    getCurrentProfile: null,
    subscribeToBroadcasts: null
};

/**
 * Initialize the Supabase client
 */
function initSupabase() {
    if (window.supabase) {
        const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        window.B2B_Supabase.client = client;
        window.B2B_Supabase.getCurrentProfile = async function() {
            const { data: { user } } = await client.auth.getUser();
            if (!user) return null;

            const { data: profile, error } = await client
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) {
                console.error("Error fetching profile:", error);
                return null;
            }
            return profile;
        };
        window.B2B_Supabase.subscribeToBroadcasts = function(callback) {
            return client
                .channel('public:broadcasts')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'broadcasts' }, payload => {
                    callback(payload.new);
                })
                .subscribe();
        };
        console.log("Supabase Client Initialized ✅");
        return true;
    }
    return false;
}

// Try to initialize immediately
if (!initSupabase()) {
    // If not loaded yet, wait for it
    const checkInterval = setInterval(() => {
        if (initSupabase()) {
            clearInterval(checkInterval);
        }
    }, 100);
    
    // Safety timeout after 5 seconds
    setTimeout(() => clearInterval(checkInterval), 5000);
}
