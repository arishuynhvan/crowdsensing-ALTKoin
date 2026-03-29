let currentUser = {
    name: "User",
    role: "CIT", // hoặc "GOV"
};


export function getUser() {
    return currentUser;
}


export function setUser(role: "CIT" | "GOV") {
    currentUser.role = role;
}
