require('dotenv').config();

function parseJwt (token) {
    if (!token) return null;
    var base64Url = token.split('.')[1];
    if (!base64Url) return null;
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

try {
  const token = process.env.SUPABASE_KEY;
  console.log(parseJwt(token));
} catch (e) {
  console.log("Not a valid JWT token:", process.env.SUPABASE_KEY);
}
