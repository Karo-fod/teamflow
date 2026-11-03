import User from "./user.model.js";

export async function getProfile(req, res, next) {
  try {
    const user = await User.findById(req.userId).select("name email");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const name =
      typeof req.body?.name === "string" ? req.body.name.trim() : "";

    if (!name || name.length > 80) {
      return res.status(400).json({
        success: false,
        message: "Name must be between 1 and 80 characters",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: { name } },
      { new: true, runValidators: true }
    ).select("name email");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
}
