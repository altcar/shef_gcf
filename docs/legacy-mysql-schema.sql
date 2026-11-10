-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: dbprovider.eu-central-1.clawcloudrun.com:47765
-- Generation Time: Feb 07, 2026 at 11:42 PM
-- Server version: 8.0.30
-- PHP Version: 8.3.27

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `virtual_venus`
--

-- --------------------------------------------------------

--
-- Table structure for table `chocolate`
--

CREATE TABLE `chocolate` (
  `id` int NOT NULL,
  `company1` tinyint(1) NOT NULL DEFAULT '0',
  `company2` tinyint(1) NOT NULL DEFAULT '0',
  `company3` tinyint(1) NOT NULL DEFAULT '0',
  `company4` tinyint(1) NOT NULL DEFAULT '0',
  `company5` tinyint(1) NOT NULL DEFAULT '0',
  `company6` tinyint(1) NOT NULL DEFAULT '0',
  `company7` tinyint(1) NOT NULL DEFAULT '0',
  `already` tinyint(1) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `registrations`
--

CREATE TABLE `registrations` (
  `id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `course` varchar(255) NOT NULL,
  `grad_year` year NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `chocolate`
--
ALTER TABLE `chocolate`
  ADD KEY `idname` (`id`);

--
-- Indexes for table `registrations`
--
ALTER TABLE `registrations`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `registrations`
--
ALTER TABLE `registrations`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `chocolate`
--
ALTER TABLE `chocolate`
  ADD CONSTRAINT `idname` FOREIGN KEY (`id`) REFERENCES `registrations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
