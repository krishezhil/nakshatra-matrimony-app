// Profile model for file-based storage (not using Sequelize)
class Profile {
  constructor(data) {
    this.id = data.id;
    this.serial_no = data.serial_no;
    this.name = data.name;
    this.father_name = data.father_name;
    this.mother_name = data.mother_name;
    this.siblings = data.siblings;
    this.gothram = data.gothram;
    this.birth_date = data.birth_date;
    this.birth_time = data.birth_time;
    this.birth_place = data.birth_place;
    this.qualification = data.qualification;
    this.job_details = data.job_details;
    this.monthly_income = data.monthly_income;
    this.address = data.address;
    this.contact_no = data.contact_no;
    this.gender = data.gender;
    this.region = data.region;
    this.additional_contact_no = data.additional_contact_no;
    this.qualification_details = data.qualification_details;
    this.is_active = data.is_active;
    this.nakshatraid = data.nakshatraid;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.is_remarried = data.is_remarried;
    this.rasi_lagnam = data.rasi_lagnam;
    this.navamsam_lagnam = data.navamsam_lagnam;
  }
}

module.exports = Profile;
