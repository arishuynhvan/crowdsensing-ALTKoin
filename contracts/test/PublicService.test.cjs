const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("PublicService", function () {
    async function deployPublicServiceFixture() {
        const [admin, citizen1, citizen2, citizen3, otherAccount] = await ethers.getSigners();

        const PublicService = await ethers.getContractFactory("PublicService");
        const publicService = await PublicService.deploy(admin.address);

        return { publicService, admin, citizen1, citizen2, citizen3, otherAccount };
    }

    const STAKE_AMOUNT = ethers.parseEther("1");
    const REPORT_FEE = ethers.parseEther("0.01");
    const REWARD_AMOUNT = ethers.parseEther("0.1");

    describe("F1: Citizen Registration", function () {
        it("Should allow a user to register as a citizen by paying the stake amount", async function () {
            const { publicService, citizen1 } = await loadFixture(deployPublicServiceFixture);

            await expect(publicService.connect(citizen1).registerCitizen({ value: STAKE_AMOUNT }))
                .to.emit(publicService, "CitizenRegistered")
                .withArgs(citizen1.address, STAKE_AMOUNT);

            expect(await publicService.stakes(citizen1.address)).to.equal(STAKE_AMOUNT);
        });

        it("Should fail if the stake amount is incorrect", async function () {
            const { publicService, citizen1 } = await loadFixture(deployPublicServiceFixture);
            await expect(publicService.connect(citizen1).registerCitizen({ value: ethers.parseEther("0.5") })).to.be.revertedWithCustomError(publicService, "InsufficientStake");
        });

        it("Should fail if the user is already registered", async function () {
            const { publicService, citizen1 } = await loadFixture(deployPublicServiceFixture);
            await publicService.connect(citizen1).registerCitizen({ value: STAKE_AMOUNT });
            await expect(publicService.connect(citizen1).registerCitizen({ value: STAKE_AMOUNT })).to.be.revertedWithCustomError(publicService, "AlreadyRegistered");
        });
    });

    describe("F3: Report Submission & Updates", function () {
        let publicService, citizen1;

        beforeEach(async function () {
            const fixture = await loadFixture(deployPublicServiceFixture);
            publicService = fixture.publicService;
            citizen1 = fixture.citizen1;
            await publicService.connect(citizen1).registerCitizen({ value: STAKE_AMOUNT });
        });

        it("Should allow an active citizen to submit a report", async function () {
            await expect(publicService.connect(citizen1).submitReport("hash1", ["cid1"], "location1", { value: REPORT_FEE }))
                .to.emit(publicService, "ReportSubmitted")
                .withArgs(0, citizen1.address);

            const report = await publicService.getReport(0);
            expect(report.reporter).to.equal(citizen1.address);
        });

        it("Should allow a reporter to update their report", async function () {
            await publicService.connect(citizen1).submitReport("hash1", ["cid1"], "location1", { value: REPORT_FEE });
            await expect(publicService.connect(citizen1).updateReport(0, "newHash", ["newCid"], "newLocation"))
                .to.emit(publicService, "ReportUpdated")
                .withArgs(0);

            const report = await publicService.getReport(0);
            expect(report.contentHash).to.equal("newHash");
            expect(report.imageCIDs[1]).to.equal("newCid");
        });
    });

    describe("F4: Voting", function () {
        let publicService, citizen1, citizen2;

        beforeEach(async function () {
            const fixture = await loadFixture(deployPublicServiceFixture);
            publicService = fixture.publicService;
            citizen1 = fixture.citizen1;
            citizen2 = fixture.citizen2;
            await publicService.connect(citizen1).registerCitizen({ value: STAKE_AMOUNT });
            await publicService.connect(citizen2).registerCitizen({ value: STAKE_AMOUNT });
            await publicService.connect(citizen1).submitReport("hash1", ["cid1"], "location1", { value: REPORT_FEE });
        });

        it("Should allow an active citizen to vote up a report", async function () {
            await expect(publicService.connect(citizen2).voteUp(0))
                .to.emit(publicService, "Voted")
                .withArgs(0, citizen2.address, true);
            const report = await publicService.getReport(0);
            expect(report.score).to.equal(1);
        });

        it("Should allow an active citizen to vote down a report", async function () {
            await expect(publicService.connect(citizen2).voteDown(0))
                .to.emit(publicService, "Voted")
                .withArgs(0, citizen2.address, false);
            const report = await publicService.getReport(0);
            expect(report.score).to.equal(-1);
        });

        it("Should not allow a citizen to vote twice", async function () {
            await publicService.connect(citizen2).voteUp(0);
            await expect(publicService.connect(citizen2).voteUp(0)).to.be.revertedWithCustomError(publicService, "AlreadyVoted");
        });
    });
    
    describe("F5: Resolution", function () {
        let publicService, admin, citizen1, citizen2, citizen3;

        beforeEach(async function () {
            const fixture = await loadFixture(deployPublicServiceFixture);
            publicService = fixture.publicService;
            admin = fixture.admin;
            citizen1 = fixture.citizen1;
            citizen2 = fixture.citizen2;
            citizen3 = fixture.citizen3;

            // Register citizens
            await publicService.connect(citizen1).registerCitizen({ value: STAKE_AMOUNT });
            await publicService.connect(citizen2).registerCitizen({ value: STAKE_AMOUNT });
            await publicService.connect(citizen3).registerCitizen({ value: STAKE_AMOUNT });

            // Submit a report
            await publicService.connect(citizen1).submitReport("hash1", ["cid1"], "location1", { value: REPORT_FEE });
        
            // Vote on the report
            await publicService.connect(citizen2).voteUp(0); // Up-voter
            await publicService.connect(citizen3).voteDown(0); // Down-voter
        });

        it("Should correctly distribute rewards when a report is approved", async function () {
            const reporterInitialStake = await publicService.stakes(citizen1.address);
            const upvoterInitialStake = await publicService.stakes(citizen2.address);
            const downvoterInitialStake = await publicService.stakes(citizen3.address);

            await expect(publicService.connect(admin).adminResolve(0, true))
                .to.emit(publicService, "ReportResolved")
                .withArgs(0, true, admin.address);

            // Reporter: refund stake + fee + reward
            const reporterFinalStake = await publicService.stakes(citizen1.address);
            const expectedReporterStake = reporterInitialStake + REPORT_FEE + REWARD_AMOUNT;
            expect(reporterFinalStake).to.equal(expectedReporterStake);
            
            // Up-voter: reward
            const upvoterFinalStake = await publicService.stakes(citizen2.address);
            expect(upvoterFinalStake).to.equal(upvoterInitialStake + REWARD_AMOUNT);

            // Down-voter: penalty
            const downvoterFinalStake = await publicService.stakes(citizen3.address);
            expect(downvoterFinalStake).to.equal(downvoterInitialStake - REWARD_AMOUNT);
        });
        
        it("Should correctly distribute penalties when a report is rejected", async function () {
            const reporterInitialStake = await publicService.stakes(citizen1.address);
            const upvoterInitialStake = await publicService.stakes(citizen2.address);
            const downvoterInitialStake = await publicService.stakes(citizen3.address);
            
            await expect(publicService.connect(admin).adminResolve(0, false))
            .to.emit(publicService, "ReportResolved")
            .withArgs(0, false, admin.address);
            
            // Reporter: penalty
            const reporterFinalStake = await publicService.stakes(citizen1.address);
            const expectedReporterStake = reporterInitialStake - REPORT_FEE - REWARD_AMOUNT;
            expect(reporterFinalStake).to.equal(expectedReporterStake);

            // Up-voter: penalty
            const upvoterFinalStake = await publicService.stakes(citizen2.address);
            expect(upvoterFinalStake).to.equal(upvoterInitialStake - REWARD_AMOUNT);
            
            // Down-voter: share the spoils
            const downvoterFinalStake = await publicService.stakes(citizen3.address);
            const totalSpoils = REWARD_AMOUNT; // Only 1 upvoter
            const expectedDownvoterStake = downvoterInitialStake + totalSpoils;
            expect(downvoterFinalStake).to.equal(expectedDownvoterStake);
        });
    });
});
