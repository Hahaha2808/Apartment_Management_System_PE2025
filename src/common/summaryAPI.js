export const baseURL = "http://localhost:8080"

const SummaryApi = {
    register : {
        url : '/api/user/register',
        method: 'post'
    },
    login : {
        url : '/api/user/login',
        method: 'post'
    },
    refreshToken : {
        url : 'api/user/refresh-token',
        method : 'post'
    },
    logout : {
        url : '/api/user/logout',
        method : 'get'
    },
    userDetails : {
        url : '/api/user/user-details',
        method : 'get'
    }
}

export default SummaryApi