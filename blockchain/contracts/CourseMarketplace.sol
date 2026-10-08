// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CourseMarketplace {
    address public owner;
    uint256 public constant ENROLLMENT_PRICE = 0.000001 ether;

    event CoursePurchased(uint256 indexed courseId, address indexed buyer, uint256 amount);
    event CourseEnrolled(uint256 indexed courseId, address indexed student);

    mapping(uint256 => mapping(address => bool)) public isEnrolled;

    constructor() {
        owner = msg.sender;
    }

    function purchaseCourse(uint256 courseId) external payable {
        _enrollCourse(courseId);
    }

    function enroll(uint256 courseId) external payable {
        _enrollCourse(courseId);
    }

    function _enrollCourse(uint256 courseId) internal {
        require(msg.value == ENROLLMENT_PRICE, "Incorrect enrollment price");
        require(!isEnrolled[courseId][msg.sender], "Already enrolled");
        isEnrolled[courseId][msg.sender] = true;

        (bool sent, ) = payable(owner).call{value: msg.value}("");
        require(sent, "Payment transfer failed");

        emit CoursePurchased(courseId, msg.sender, msg.value);
        emit CourseEnrolled(courseId, msg.sender);
    }
}
