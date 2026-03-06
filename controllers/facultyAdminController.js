const Faculty = require('../models/Faculty');

exports.getPending = async (req, res) => {
    try {
        const pendingFaculties = await Faculty.find({ status: 'pending' }).sort({ createdAt: -1 });
        const approvedFaculties = await Faculty.find({ status: 'approved' }).sort({ createdAt: -1 });
        res.render('admin/manage_faculty', { pendingFaculties, approvedFaculties });
    } catch (error) {
        console.error(error);
        res.send('Server Error loading faculty data');
    }
};

exports.approveFaculty = async (req, res) => {
    try {
        const { id } = req.params;
        const faculty = await Faculty.findById(id);
        if(!faculty) return res.send('Faculty not found');
        faculty.status = 'approved';
        await faculty.save();
        res.redirect('/admin/faculty/pending');
    } catch (error) {
        console.error(error);
        res.send('Server error rejecting');
    }
};

exports.rejectFaculty = async (req, res) => {
    try {
        const { id } = req.params;
        const faculty = await Faculty.findById(id);
        if(!faculty) return res.send('Faculty not found');
        faculty.status = 'rejected';
        await faculty.save();
        res.redirect('/admin/faculty/pending');
    } catch (error) {
        console.error(error);
        res.send('Server error rejecting');
    }
};
