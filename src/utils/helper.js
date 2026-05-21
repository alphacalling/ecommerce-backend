// otp
exports.generateOTP = (length = 6) => {
  const digits = "1234567890";
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp = otp + digits[Math.floor(Math.random() * 10)];
  }
  return otp;
};

// unique order number
exports.generateOrderNumber = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `ORD-${timestamp}-${random}`.toUpperCase();
};

// pagination
exports.paginate = (page = 1, limit = 10) => {
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;
  return { skip, limit: limitNum, page: pageNum };
};

//format pagination response
exports.paginationResponse = (data, total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

// sanitize user data
exports.sanitizeUser = (user) => {
  const userObj = user.toObject ? user.toobject() : user;
  delete userObj.password;
  delete userObj.otp;
  delete userObj.sessions;
  return userObj;
};
