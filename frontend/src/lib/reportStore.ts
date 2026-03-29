"use client";


export type Report = {
    id: number;
    content: string;
    cids: string[];
    score: number;
    timestamp: number;
};


// localStorage keys
const DRAFT_KEY = "drafts";
const REPORT_KEY = "reports";


// ======================
// DRAFT
// ======================
export const getDrafts = (): any[] => {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || "[]");
};


export const saveDrafts = (drafts: any[]) => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
};


// ======================
// REPORT
// ======================
export const getLocalReports = (): Report[] => {
    return JSON.parse(localStorage.getItem(REPORT_KEY) || "[]");
};


export const saveLocalReports = (reports: Report[]) => {
    localStorage.setItem(REPORT_KEY, JSON.stringify(reports));
};
