const fs = require('fs');

const dashboardEjs = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Faculty Dashboard | AptitudePro</title>
    <!-- Add Bootstrap for dashboard styling so it's beautiful and responsive -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #f8f9fa; }
        #sidebar-wrapper { min-height: 100vh; width: 250px; }
        .sidebar-heading { padding: 1.5rem; font-size: 1.25rem; }
    </style>
</head>
<body>
<div class="d-flex" id="wrapper">
    <!-- Sidebar -->
    <div class="bg-dark text-white" id="sidebar-wrapper">
        <div class="sidebar-heading text-center fw-bold border-bottom border-secondary mb-3">
            <span style="color: #58a6ff;">Aptitude</span>Pro<br><small class="text-white-50" style="font-size: 0.8rem;">Faculty Panel</small>
        </div>
        <div class="list-group list-group-flush my-3">
            <a href="/faculty/dashboard" class="list-group-item list-group-item-action bg-transparent text-white fw-bold">
                <i class="bi bi-speedometer2 me-2"></i>Dashboard
            </a>
            <a href="#" class="list-group-item list-group-item-action bg-transparent text-white">
                <i class="bi bi-card-checklist me-2"></i>Evaluations Queue (Soon)
            </a>
            <a href="#" class="list-group-item list-group-item-action bg-transparent text-white">
                <i class="bi bi-clock-history me-2"></i>My History (Soon)
            </a>
            <a href="/" class="list-group-item list-group-item-action bg-transparent text-white mt-5">
                <i class="bi bi-box-arrow-left me-2"></i>Return to Home
            </a>
        </div>
    </div>
    
    <!-- Page Content -->
    <div id="page-content-wrapper" class="w-100">
        <nav class="navbar navbar-expand-lg navbar-light bg-white py-3 px-4 shadow-sm">
            <div class="d-flex align-items-center">
                <h4 class="m-0 fw-bold">Welcome, Prof. <%= faculty.name %></h4>
            </div>
            <div class="ms-auto d-flex align-items-center">
                <span class="me-3 fw-medium text-secondary"><%= faculty.email %></span>
                <a href="/faculty/logout" class="btn btn-outline-danger btn-sm">Logout</a>
            </div>
        </nav>

        <div class="container-fluid px-4 py-5">
            <div class="row g-4">
                <div class="col-md-4">
                    <div class="card shadow-sm border-0 h-100 bg-primary text-white border-start border-5 border-dark">
                        <div class="card-body py-4">
                            <h5 class="card-title text-uppercase text-white-50 fw-bold mb-3">Pending Checks</h5>
                            <h2 class="display-5 fw-bold mb-0">0</h2>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card shadow-sm border-0 h-100 bg-success text-white border-start border-5 border-dark">
                        <div class="card-body py-4">
                            <h5 class="card-title text-uppercase text-white-50 fw-bold mb-3">Completed</h5>
                            <h2 class="display-5 fw-bold mb-0">0</h2>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card shadow-sm border-0 h-100 bg-info text-white border-start border-5 border-dark">
                        <div class="card-body py-4">
                            <h5 class="card-title text-uppercase text-white-50 fw-bold mb-3">Rating</h5>
                            <h2 class="display-5 fw-bold mb-0">--</h2>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row mt-5">
                <div class="col-12">
                    <div class="card shadow-sm border-0">
                        <div class="card-header bg-white py-3">
                            <h5 class="mb-0 fw-bold">Your Assigned Evaluations Queue</h5>
                        </div>
                        <div class="card-body text-center py-5">
                            <p class="text-muted mb-0">No essays or exam papers assigned to you currently.</p>
                            <button class="btn btn-outline-primary mt-3 disabled">Refresh Queue</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`;

fs.writeFileSync('views/faculty/dashboard.ejs', dashboardEjs);
