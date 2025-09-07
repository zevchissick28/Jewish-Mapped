// Global variables
console.log('Script.js is loading...');
let institutionsData = {};
let allInstitutions = [];

// Load the JSON data
async function loadInstitutionsData() {
    try {
        const response = await fetch('USinstitutionDB.json');
        institutionsData = await response.json();
        
        // Flatten the data for easier searching
        allInstitutions = [];
        for (const zipCode in institutionsData) {
            institutionsData[zipCode].forEach(institution => {
                allInstitutions.push({
                    ...institution,
                    zipCode: zipCode
                });
            });
        }
        
        // Load initial recommendations
        loadRecommendations();
        
        console.log(`Loaded ${allInstitutions.length} institutions from ${Object.keys(institutionsData).length} zip codes`);
    } catch (error) {
        console.error('Error loading institutions data:', error);
    }
}

// Tab switching functionality
document.addEventListener('DOMContentLoaded', function() {
    // Load data
    loadInstitutionsData();
    
    // Tab functionality
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Remove active class from all tabs and panes
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding pane
            this.classList.add('active');
            document.getElementById(tabId + '-tab').classList.add('active');
        });
    });
    
    // AI Search functionality
    const aiSearchBtn = document.getElementById('aiSearchBtn');
    const aiSearchInput = document.getElementById('aiSearchInput');
    
    aiSearchBtn.addEventListener('click', handleAISearch);
    aiSearchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleAISearch();
        }
    });
    
    // Zipcode search enter key
    const zipcodeInput = document.getElementById('zipcodeInput');
    zipcodeInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchByZipcode();
        }
    });
});

// AI Search Handler (simulated)
async function handleAISearch() {
    const query = document.getElementById('aiSearchInput').value.trim();
    if (!query) return;
    
    showLoading();
    
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // AI-powered search simulation
    const results = simulateAISearch(query);
    displayResults(results, `AI Search Results for: "${query}"`);
    
    hideLoading();
    scrollToResults();
}

// Simulate AI search functionality
function simulateAISearch(query) {
    const queryLower = query.toLowerCase();
    const results = [];
    
    // Enhanced keyword matching with scoring
    allInstitutions.forEach(institution => {
        let score = 0;
        
        // Search in institution name
        if (institution['Synagogue Name'].toLowerCase().includes(queryLower)) {
            score += 10;
        }
        
        // Search in denomination
        if (institution.Denomination && institution.Denomination.toLowerCase().includes(queryLower)) {
            score += 8;
        }
        
        // Search in address for location-based queries
        if (institution['Full Address'].toLowerCase().includes(queryLower)) {
            score += 6;
        }
        
        // Search in educational programs
        const programs = institution['Educational Programs'];
        if (programs) {
            for (const program in programs) {
                if (program.toLowerCase().includes(queryLower) || 
                    programs[program].toLowerCase().includes(queryLower)) {
                    score += 5;
                }
            }
        }
        
        // Keyword-based scoring for common queries
        const keywords = {
            'orthodox': ['orthodox'],
            'reform': ['reform'],
            'conservative': ['conservative'],
            'chabad': ['chabad'],
            'youth': ['youth', 'teen', 'children'],
            'school': ['school', 'education', 'hebrew'],
            'family': ['family', 'intergenerational'],
            'online': ['online', 'virtual', 'zoom'],
            'hillel': ['hillel', 'university', 'college'],
            'programs': ['programs', 'activities', 'classes']
        };
        
        for (const category in keywords) {
            if (queryLower.includes(category)) {
                keywords[category].forEach(keyword => {
                    if (JSON.stringify(institution).toLowerCase().includes(keyword)) {
                        score += 3;
                    }
                });
            }
        }
        
        // Location-specific queries
        const locationTerms = ['near me', 'nearby', 'close', 'local'];
        if (locationTerms.some(term => queryLower.includes(term))) {
            // For demo purposes, we'll prioritize institutions with comprehensive programs
            if (programs && Object.keys(programs).length > 5) {
                score += 4;
            }
        }
        
        if (score > 0) {
            results.push({ institution, score });
        }
    });
    
    // Sort by score and return top results
    return results
        .sort((a, b) => b.score - a.score)
        .slice(0, 12)
        .map(result => result.institution);
}

// Search by zipcode and nearby areas
function searchByZipcode() {
    const zipcode = document.getElementById('zipcodeInput').value.trim();
    if (!zipcode) return;
    
    showLoading();
    
    setTimeout(() => {
        const results = findNearbyZipCodes(zipcode);
        displayResults(results, `Results for ${zipcode} and nearby areas`);
        hideLoading();
        scrollToResults();
    }, 500);
}

// Find institutions in the searched zip code and nearby zip codes
function findNearbyZipCodes(searchZip) {
    const results = [];
    const searchZipNum = parseInt(searchZip);
    
    // First, add exact match if it exists
    if (institutionsData[searchZip]) {
        institutionsData[searchZip].forEach(inst => {
            results.push({ ...inst, zipCode: searchZip, distance: 0 });
        });
    }
    
    // Then find nearby zip codes (within a reasonable range)
    const nearbyZips = [];
    
    for (const zipCode in institutionsData) {
        const zipNum = parseInt(zipCode);
        if (zipNum && Math.abs(zipNum - searchZipNum) <= 50) { // Within 50 zip code numbers
            nearbyZips.push(zipCode);
        }
    }
    
    // Add results from nearby zip codes
    nearbyZips.forEach(zipCode => {
        if (zipCode !== searchZip) { // Don't duplicate exact match
            institutionsData[zipCode].forEach(inst => {
                const distance = Math.abs(parseInt(zipCode) - searchZipNum);
                results.push({ ...inst, zipCode: zipCode, distance: distance });
            });
        }
    });
    
    // Sort by distance (exact match first, then by proximity)
    results.sort((a, b) => a.distance - b.distance);
    
    // Limit to reasonable number of results
    return results.slice(0, 20);
}

// Search by category
function searchByCategory(category) {
    showLoading();
    
    setTimeout(() => {
        let results = [];
        
        switch(category) {
            case 'synagogue':
                results = allInstitutions.filter(inst => 
                    inst['Synagogue Name'] && 
                    !inst['Synagogue Name'].toLowerCase().includes('hillel')
                );
                break;
            case 'school':
                results = allInstitutions.filter(inst => {
                    const programs = inst['Educational Programs'];
                    return programs && programs['Hebrew School'] && 
                           programs['Hebrew School'].toLowerCase().includes('yes');
                });
                break;
            case 'youth':
                results = allInstitutions.filter(inst => {
                    const programs = inst['Educational Programs'];
                    const hasYouthPrograms = programs && programs['Youth Groups'] && 
                                           programs['Youth Groups'].toLowerCase().includes('yes');
                    const hasHebrewSchool = programs && programs['Hebrew School'] && 
                                          programs['Hebrew School'].toLowerCase().includes('yes');
                    
                    // Only show if has youth programs BUT NOT if it's primarily a Hebrew School
                    return hasYouthPrograms && !hasHebrewSchool;
                });
                break;
            case 'education':
                results = allInstitutions.filter(inst => {
                    const programs = inst['Educational Programs'];
                    return programs && programs['Adult Education'] && 
                           programs['Adult Education'].toLowerCase().includes('yes');
                });
                break;
            case 'hillel':
                results = allInstitutions.filter(inst => 
                    inst['Synagogue Name'].toLowerCase().includes('hillel')
                );
                break;
            case 'community':
                results = allInstitutions.filter(inst => {
                    const programs = inst['Educational Programs'];
                    return programs && programs['Family and Intergenerational Learning'] && 
                           programs['Family and Intergenerational Learning'].toLowerCase().includes('yes');
                });
                break;
        }
        
        displayResults(results.slice(0, 20), `${category.charAt(0).toUpperCase() + category.slice(1)} Results`);
        hideLoading();
        scrollToResults();
    }, 500);
}

// Search by affiliation
function searchByAffiliation(affiliation) {
    showLoading();
    
    setTimeout(() => {
        const results = allInstitutions.filter(inst => 
            inst.Denomination && 
            inst.Denomination.toLowerCase().includes(affiliation.toLowerCase())
        );
        
        displayResults(results.slice(0, 20), `${affiliation} Institutions`);
        hideLoading();
        scrollToResults();
    }, 500);
}

// Display results
function displayResults(results, title) {
    const searchResults = document.getElementById('searchResults');
    const resultsGrid = document.getElementById('resultsGrid');
    const resultsTitle = document.getElementById('resultsTitle');
    
    if (results.length === 0) {
        resultsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
                <h3>No results found</h3>
                <p>Try adjusting your search criteria or try a different search term.</p>
            </div>
        `;
    } else {
        resultsGrid.innerHTML = results.map(createInstitutionCard).join('');
    }
    
    // Update title
    if (resultsTitle) {
        resultsTitle.textContent = title;
    }
    searchResults.style.display = 'block';
}

// Create institution card HTML
function createInstitutionCard(institution) {
    const programs = institution['Educational Programs'] || {};
    const availablePrograms = [];
    
    // Extract available programs
    for (const program in programs) {
        if (programs[program].toLowerCase().includes('yes')) {
            availablePrograms.push(program);
        }
    }
    
    return `
        <div class="institution-card">
            <div class="card-header">
                <div class="card-title">${institution['Synagogue Name']}</div>
                <div class="card-denomination">${institution.Denomination || 'N/A'}</div>
            </div>
            <div class="card-body">
                <div class="card-address">
                    <i class="fas fa-map-marker-alt"></i>
                    ${institution['Full Address']}
                </div>
                ${institution['Phone Number'] ? `
                    <div class="card-phone">
                        <i class="fas fa-phone"></i>
                        ${institution['Phone Number']}
                    </div>
                ` : ''}
                
                ${availablePrograms.length > 0 ? `
                    <div class="card-programs">
                        <strong>Available Programs:</strong><br>
                        ${availablePrograms.slice(0, 4).map(program => 
                            `<span class="program-tag">${program}</span>`
                        ).join('')}
                        ${availablePrograms.length > 4 ? `<span class="program-tag">+${availablePrograms.length - 4} more</span>` : ''}
                    </div>
                ` : ''}
                
                ${institution.Website ? `
                    <div class="card-website">
                        <a href="${institution.Website}" target="_blank" class="website-btn">
                            <i class="fas fa-external-link-alt"></i> Visit Website
                        </a>
                    </div>
                ` : ''}
                
                <div class="card-actions">
                    <button class="connect-btn" onclick="connectToInstitution('${institution['Synagogue Name'].replace(/'/g, "\\'")}', '${institution.Denomination || 'N/A'}', '${institution['Full Address'].replace(/'/g, "\\'")}', '${getInstitutionType(institution)}')">
                        <i class="fas fa-plus"></i> Connect
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Load recommendations based on cookies/preferences (simulated)
function loadRecommendations() {
    if (allInstitutions.length === 0) return;
    
    // Simulate user preferences based on "cookies"
    const userPreferences = getUserPreferences();
    let recommendations = [];
    
    // Generate recommendations based on preferences
    if (userPreferences.includes('family')) {
        recommendations.push(...allInstitutions.filter(inst => {
            const programs = inst['Educational Programs'];
            return programs && programs['Family and Intergenerational Learning'] && 
                   programs['Family and Intergenerational Learning'].toLowerCase().includes('yes');
        }).slice(0, 2));
    }
    
    if (userPreferences.includes('youth')) {
        recommendations.push(...allInstitutions.filter(inst => {
            const programs = inst['Educational Programs'];
            return programs && programs['Youth Groups'] && 
                   programs['Youth Groups'].toLowerCase().includes('yes');
        }).slice(0, 2));
    }
    
    if (userPreferences.includes('education')) {
        recommendations.push(...allInstitutions.filter(inst => {
            const programs = inst['Educational Programs'];
            return programs && programs['Adult Education'] && 
                   programs['Adult Education'].toLowerCase().includes('yes');
        }).slice(0, 2));
    }
    
    // If no specific preferences, show diverse institutions
    if (recommendations.length === 0) {
        // Get a mix of different denominations and programs
        const denominations = ['Reform', 'Conservative', 'Orthodox', 'Chabad'];
        denominations.forEach(denom => {
            const inst = allInstitutions.find(i => 
                i.Denomination && i.Denomination.includes(denom)
            );
            if (inst) recommendations.push(inst);
        });
    }
    
    // Remove duplicates and limit to 6
    recommendations = [...new Set(recommendations)].slice(0, 6);
    
    // Display recommendations
    const recommendationsGrid = document.getElementById('recommendationsGrid');
    recommendationsGrid.innerHTML = recommendations.map(createInstitutionCard).join('');
}

// Simulate getting user preferences from cookies
function getUserPreferences() {
    // In a real app, this would read from actual cookies or user profile
    const preferences = localStorage.getItem('userPreferences');
    if (preferences) {
        return JSON.parse(preferences);
    }
    
    // Default preferences for demo
    const defaultPrefs = ['family', 'education', 'youth'];
    localStorage.setItem('userPreferences', JSON.stringify(defaultPrefs));
    return defaultPrefs;
}

// Utility functions
function showLoading() {
    document.getElementById('loadingSpinner').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingSpinner').style.display = 'none';
}

function scrollToResults() {
    document.getElementById('searchResults').scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
}

// Update user preferences (for future enhancement)
function updateUserPreferences(newPreferences) {
    localStorage.setItem('userPreferences', JSON.stringify(newPreferences));
    loadRecommendations(); // Refresh recommendations
}

// Enhanced search with geolocation (for future enhancement)
function searchNearMe() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            // In a real app, you would use a geocoding service to find nearby zip codes
            // For now, we'll just show a selection of institutions
            const sampleResults = allInstitutions.slice(0, 10);
            displayResults(sampleResults, 'Institutions Near You');
            scrollToResults();
        });
    }
}

// Initialize search suggestions (for future enhancement)
function initializeSearchSuggestions() {
    const aiSearchInput = document.getElementById('aiSearchInput');
    
    // Create a datalist for suggestions
    const datalist = document.createElement('datalist');
    datalist.id = 'searchSuggestions';
    
    const suggestions = [
        'Orthodox synagogue with youth programs',
        'Reform temple with Hebrew school',
        'Conservative synagogue near me',
        'Chabad house with family programs',
        'Jewish day school',
        'Hillel at university',
        'Synagogue with online services',
        'Jewish community center',
        'Adult education classes',
        'Bar/Bat Mitzvah preparation'
    ];
    
    suggestions.forEach(suggestion => {
        const option = document.createElement('option');
        option.value = suggestion;
        datalist.appendChild(option);
    });
    
    document.body.appendChild(datalist);
    aiSearchInput.setAttribute('list', 'searchSuggestions');
}

// =============================================================================
// AUTHENTICATION SYSTEM
// =============================================================================

// Database simulation - In a real application, this would be handled by a backend server
let userDatabase = JSON.parse(localStorage.getItem('jewishMappedUsers')) || [];
let currentUser = JSON.parse(localStorage.getItem('jewishMappedCurrentUser')) || null;

// Authentication Modal Functions
function openAuthModal() {
    console.log('openAuthModal called');
    const modal = document.getElementById('authModal');
    console.log('Modal element:', modal);
    if (modal) {
        modal.style.display = 'flex';
        showLoginForm();
    } else {
        console.error('Modal element not found!');
    }
}

function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
    // Clear forms
    document.getElementById('loginForm').querySelector('form').reset();
    document.getElementById('signupForm').querySelector('form').reset();
    hideOtherInterestField();
}

function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('signupForm').style.display = 'none';
}

function showSignupForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'block';
}

// Handle Login
function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // Find user in database
    const user = userDatabase.find(u => u.email === email && u.password === password);
    
    if (user) {
        // Successful login
        currentUser = user;
        localStorage.setItem('jewishMappedCurrentUser', JSON.stringify(currentUser));
        
        alert(`Welcome back, ${user.firstName}!`);
        closeAuthModal();
        updateUIForLoggedInUser();
    } else {
        alert('Invalid email or password. Please try again.');
    }
}

// Handle Signup
function handleSignup(event) {
    event.preventDefault();
    
    // Collect form data
    const formData = {
        id: Date.now(), // Simple ID generation
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('signupEmail').value,
        password: document.getElementById('signupPassword').value,
        address1: document.getElementById('address1').value,
        address2: document.getElementById('address2').value,
        city: document.getElementById('city').value,
        state: document.getElementById('state').value,
        zipCode: document.getElementById('zipCode').value,
        homeAddress: buildFullAddress(), // Combined address for backward compatibility
        jewishAffiliation: document.getElementById('jewishAffiliation').value,
        interests: getSelectedInterests(),
        otherInterestDetails: document.getElementById('otherInterestDetails').value,
        registrationDate: new Date().toISOString(),
        lastLogin: new Date().toISOString()
    };
    
    // Validate required fields
    if (!validateSignupForm(formData)) {
        return;
    }
    
    // Check if email already exists
    if (userDatabase.find(u => u.email === formData.email)) {
        alert('An account with this email already exists. Please use a different email or sign in.');
        return;
    }
    
    // Add user to database
    userDatabase.push(formData);
    localStorage.setItem('jewishMappedUsers', JSON.stringify(userDatabase));
    
    // Log user in automatically
    currentUser = formData;
    localStorage.setItem('jewishMappedCurrentUser', JSON.stringify(currentUser));
    
    // Show success message with storage info
    alert(`Welcome to Jewish Mapped, ${formData.firstName}! Your account has been created successfully.\n\nYour data is stored locally in your browser's localStorage for this demo.`);
    
    console.log('User data stored in localStorage:', formData);
    console.log('All users database:', userDatabase);
    
    closeAuthModal();
    updateUIForLoggedInUser();
    
    // Redirect to profile page after signup
    setTimeout(() => {
        showProfilePage();
    }, 500);
}

// Get selected interests from checkboxes
function getSelectedInterests() {
    const checkboxes = document.querySelectorAll('input[name="interests"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

// Build full address from separate fields
function buildFullAddress() {
    const address1 = document.getElementById('address1').value.trim();
    const address2 = document.getElementById('address2').value.trim();
    const city = document.getElementById('city').value.trim();
    const state = document.getElementById('state').value.trim();
    const zipCode = document.getElementById('zipCode').value.trim();
    
    let fullAddress = address1;
    if (address2) {
        fullAddress += ', ' + address2;
    }
    fullAddress += ', ' + city + ', ' + state + ' ' + zipCode;
    
    return fullAddress;
}

// Validate signup form
function validateSignupForm(data) {
    if (!data.firstName.trim()) {
        alert('Please enter your first name.');
        return false;
    }
    
    if (!data.lastName.trim()) {
        alert('Please enter your last name.');
        return false;
    }
    
    if (!data.email.trim()) {
        alert('Please enter your email address.');
        return false;
    }
    
    if (!data.password || data.password.length < 6) {
        alert('Password must be at least 6 characters long.');
        return false;
    }
    
    if (!data.address1.trim()) {
        alert('Please enter your street address.');
        return false;
    }
    
    if (!data.city.trim()) {
        alert('Please enter your city.');
        return false;
    }
    
    if (!data.state.trim()) {
        alert('Please enter your state.');
        return false;
    }
    
    if (!data.zipCode.trim()) {
        alert('Please enter your zip code.');
        return false;
    }
    
    // Validate zip code format
    const zipPattern = /^[0-9]{5}(-[0-9]{4})?$/;
    if (!zipPattern.test(data.zipCode.trim())) {
        alert('Please enter a valid zip code (e.g., 12345 or 12345-6789).');
        return false;
    }
    
    if (!data.jewishAffiliation) {
        alert('Please select your Jewish affiliation.');
        return false;
    }
    
    if (data.interests.length === 0) {
        alert('Please select at least one interest.');
        return false;
    }
    
    // If "other" is selected, make sure they filled out the details
    if (data.interests.includes('other') && !data.otherInterestDetails.trim()) {
        alert('Please describe your other interests.');
        return false;
    }
    
    return true;
}

// Show/hide other interest field
function setupOtherInterestToggle() {
    const otherCheckbox = document.getElementById('otherInterest');
    const otherGroup = document.getElementById('otherInterestGroup');
    
    if (otherCheckbox) {
        otherCheckbox.addEventListener('change', function() {
            if (this.checked) {
                otherGroup.style.display = 'block';
                document.getElementById('otherInterestDetails').required = true;
            } else {
                otherGroup.style.display = 'none';
                document.getElementById('otherInterestDetails').required = false;
                document.getElementById('otherInterestDetails').value = '';
            }
        });
    }
}

function hideOtherInterestField() {
    document.getElementById('otherInterestGroup').style.display = 'none';
    document.getElementById('otherInterestDetails').required = false;
}

// Update UI for logged-in user
function updateUIForLoggedInUser() {
    const signInBtn = document.querySelector('.sign-in-btn');
    const profileLink = document.getElementById('myProfileLink');
    
    if (currentUser && signInBtn) {
        signInBtn.textContent = `Hi, ${currentUser.firstName}`;
        signInBtn.onclick = showUserProfile;
        
        // Show My Profile link
        if (profileLink) {
            profileLink.style.display = 'inline-block';
        }
    }
}

// Show user profile (placeholder)
function showUserProfile() {
    if (currentUser) {
        alert(`User Profile:\n\nName: ${currentUser.firstName} ${currentUser.lastName}\nEmail: ${currentUser.email}\nAffiliation: ${currentUser.jewishAffiliation}\nInterests: ${currentUser.interests.join(', ')}\n\nClick here to log out.`);
        
        // Simple logout option
        if (confirm('Would you like to log out?')) {
            logout();
        }
    }
}

// Logout function
function logout() {
    currentUser = null;
    localStorage.removeItem('jewishMappedCurrentUser');
    
    const signInBtn = document.querySelector('.sign-in-btn');
    const profileLink = document.getElementById('myProfileLink');
    
    if (signInBtn) {
        signInBtn.textContent = 'Sign in';
        signInBtn.onclick = openAuthModal;
    }
    
    // Hide My Profile link
    if (profileLink) {
        profileLink.style.display = 'none';
    }
    
    // Hide profile page if currently viewing it
    const profilePage = document.getElementById('profilePage');
    if (profilePage && profilePage.style.display === 'block') {
        hideProfilePage();
    }
    
    alert('You have been logged out successfully.');
}

// Initialize authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    setupOtherInterestToggle();
    
    // Check if user is already logged in
    if (currentUser) {
        updateUIForLoggedInUser();
    }
    
    // Close modal when clicking outside
    document.getElementById('authModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeAuthModal();
        }
    });
});

// =============================================================================
// PROFILE PAGE FUNCTIONALITY
// =============================================================================

// Show profile page
function showProfilePage() {
    if (!currentUser) {
        alert('Please sign in to view your profile.');
        openAuthModal();
        return;
    }
    
    // Hide other sections
    document.querySelector('.hero').style.display = 'none';
    document.getElementById('searchResults').style.display = 'none';
    
    // Show profile page
    document.getElementById('profilePage').style.display = 'block';
    
    // Load profile data
    loadProfileData();
    loadUserConnections();
    
    // Scroll to top
    window.scrollTo(0, 0);
}

// Hide profile page and return to main view
function hideProfilePage() {
    document.getElementById('profilePage').style.display = 'none';
    document.querySelector('.hero').style.display = 'block';
    window.scrollTo(0, 0);
}

// Load user profile data into the profile page
function loadProfileData() {
    if (!currentUser) return;
    
    document.getElementById('profileName').textContent = `${currentUser.firstName} ${currentUser.lastName}`;
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('profileAddress').textContent = currentUser.homeAddress || `${currentUser.address1}, ${currentUser.city}, ${currentUser.state} ${currentUser.zipCode}`;
    document.getElementById('profileAffiliation').textContent = currentUser.jewishAffiliation || 'Not specified';
    document.getElementById('profileInterests').textContent = currentUser.interests.join(', ') || 'None specified';
    
    // Format registration date
    const regDate = new Date(currentUser.registrationDate);
    document.getElementById('profileMemberSince').textContent = regDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Get institution type for connection categorization
function getInstitutionType(institution) {
    const name = institution['Synagogue Name'].toLowerCase();
    const programs = institution['Educational Programs'] || {};
    
    if (name.includes('hillel')) return 'hillel';
    if (programs['Hebrew School'] && programs['Hebrew School'].toLowerCase().includes('yes')) return 'school';
    if (programs['Youth Groups'] && programs['Youth Groups'].toLowerCase().includes('yes')) return 'youth';
    if (programs['Family and Intergenerational Learning'] && programs['Family and Intergenerational Learning'].toLowerCase().includes('yes')) return 'community';
    return 'synagogue';
}

// Connect to an institution
function connectToInstitution(name, denomination, address, type) {
    if (!currentUser) {
        alert('Please sign in to connect with institutions.');
        openAuthModal();
        return;
    }
    
    // Get existing connections
    const connections = getUserConnections();
    
    // Check if already connected
    const existingConnection = connections.find(conn => conn.name === name);
    if (existingConnection) {
        alert(`You're already connected to ${name}!`);
        return;
    }
    
    // Create new connection
    const newConnection = {
        id: Date.now(),
        name: name,
        denomination: denomination,
        address: address,
        type: type,
        connectedDate: new Date().toISOString(),
        status: 'active'
    };
    
    // Add to connections
    connections.push(newConnection);
    saveUserConnections(connections);
    
    // Update current user's connections count
    currentUser.connectionsCount = connections.length;
    localStorage.setItem('jewishMappedCurrentUser', JSON.stringify(currentUser));
    
    // Show success message
    alert(`Successfully connected to ${name}! You can view all your connections in your profile.`);
    
    // If profile page is open, refresh it
    const profilePage = document.getElementById('profilePage');
    if (profilePage.style.display === 'block') {
        loadUserConnections();
    }
}

// Get user's connections from localStorage
function getUserConnections() {
    if (!currentUser) return [];
    
    const connectionsKey = `connections_${currentUser.id}`;
    const connections = localStorage.getItem(connectionsKey);
    return connections ? JSON.parse(connections) : [];
}

// Save user's connections to localStorage
function saveUserConnections(connections) {
    if (!currentUser) return;
    
    const connectionsKey = `connections_${currentUser.id}`;
    localStorage.setItem(connectionsKey, JSON.stringify(connections));
}

// Load and display user connections
function loadUserConnections() {
    const connections = getUserConnections();
    
    // Update stats
    document.getElementById('totalConnections').textContent = connections.length;
    
    // Calculate recent connections (this month)
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const recentConnections = connections.filter(conn => 
        new Date(conn.connectedDate) >= thisMonth
    );
    document.getElementById('recentConnections').textContent = recentConnections.length;
    
    // Display connections
    displayConnections(connections);
}

// Display connections in the list
function displayConnections(connections, filter = 'all') {
    const connectionsList = document.getElementById('connectionsList');
    
    // Filter connections
    let filteredConnections = connections;
    if (filter !== 'all') {
        filteredConnections = connections.filter(conn => conn.type === filter);
    }
    
    if (filteredConnections.length === 0) {
        connectionsList.innerHTML = `
            <div class="no-connections">
                <i class="fas fa-heart"></i>
                <h4>${filter === 'all' ? 'No connections yet' : `No ${filter} connections`}</h4>
                <p>${filter === 'all' ? 
                    'Start exploring Jewish institutions and programs to build your community network!' :
                    `You haven't connected with any ${filter} institutions yet.`
                }</p>
                <button class="explore-btn" onclick="hideProfilePage()">
                    <i class="fas fa-search"></i>
                    Explore Now
                </button>
            </div>
        `;
        return;
    }
    
    // Sort by connection date (newest first)
    filteredConnections.sort((a, b) => new Date(b.connectedDate) - new Date(a.connectedDate));
    
    connectionsList.innerHTML = filteredConnections.map(connection => `
        <div class="connection-item">
            <div class="connection-header">
                <div>
                    <div class="connection-name">${connection.name}</div>
                    <span class="connection-type">${connection.denomination}</span>
                </div>
                <div class="connection-date">
                    Connected: ${new Date(connection.connectedDate).toLocaleDateString()}
                </div>
            </div>
            
            <div class="connection-address">
                <i class="fas fa-map-marker-alt"></i>
                ${connection.address}
            </div>
            
            <div class="connection-actions">
                <button class="connection-btn primary" onclick="visitConnectionWebsite('${connection.name}')">
                    <i class="fas fa-external-link-alt"></i> Visit
                </button>
                <button class="connection-btn" onclick="contactConnection('${connection.name}')">
                    <i class="fas fa-phone"></i> Contact
                </button>
                <button class="connection-btn" onclick="removeConnection(${connection.id})">
                    <i class="fas fa-times"></i> Remove
                </button>
            </div>
        </div>
    `).join('');
}

// Filter connections by type
function filterConnections(type) {
    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Display filtered connections
    const connections = getUserConnections();
    displayConnections(connections, type);
}

// Visit connection website (placeholder)
function visitConnectionWebsite(institutionName) {
    // In a real app, this would open the institution's website
    // For now, we'll just show a message
    alert(`Opening website for ${institutionName}...`);
}

// Contact connection (placeholder)
function contactConnection(institutionName) {
    alert(`Contact information for ${institutionName} would be displayed here.`);
}

// Remove a connection
function removeConnection(connectionId) {
    if (!confirm('Are you sure you want to remove this connection?')) {
        return;
    }
    
    const connections = getUserConnections();
    const updatedConnections = connections.filter(conn => conn.id !== connectionId);
    
    saveUserConnections(updatedConnections);
    
    // Update current user's connections count
    currentUser.connectionsCount = updatedConnections.length;
    localStorage.setItem('jewishMappedCurrentUser', JSON.stringify(currentUser));
    
    // Refresh the connections display
    loadUserConnections();
}

// Edit profile (placeholder)
function editProfile() {
    alert('Profile editing functionality would be implemented here. This would open a form to edit user information.');
}

// =============================================================================
// DATA STORAGE INFORMATION
// =============================================================================

/*
USER DATA STORAGE INFORMATION:

All user data is currently stored in the browser's localStorage for demonstration purposes.
This includes:

1. User Registration Data:
   - firstName: User's first name
   - lastName: User's last name  
   - email: Email address (used for login)
   - password: Password (stored as plain text for demo - would be hashed in production)
   - homeAddress: Complete home address
   - jewishAffiliation: Selected Jewish affiliation
   - interests: Array of selected interests
   - otherInterestDetails: Description of other interests (if selected)
   - registrationDate: When account was created
   - lastLogin: Last login timestamp

2. Storage Location:
   - localStorage key: 'jewishMappedUsers' (array of all users)
   - localStorage key: 'jewishMappedCurrentUser' (currently logged in user)

3. Accessing the Data:
   - Open browser dev tools (F12)
   - Go to Application tab > Local Storage
   - Look for 'jewishMappedUsers' and 'jewishMappedCurrentUser'

4. In Production:
   - Data would be stored in a secure database (PostgreSQL, MongoDB, etc.)
   - Passwords would be hashed using bcrypt or similar
   - User sessions would be managed with JWT tokens or server sessions
   - Personal data would be encrypted and comply with privacy regulations
   - Regular backups and data protection measures would be implemented

5. Current Demo Features:
   - User registration with all requested fields
   - Login/logout functionality
   - Data persistence across browser sessions
   - Form validation
   - Interest selection with "other" option handling
*/ 