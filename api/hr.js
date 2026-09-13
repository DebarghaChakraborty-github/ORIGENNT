export default async function handler(req, res) {
  const APPS_SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbxYs-3m5_wcJYT4MG3m1O3_8_nW0Yn-rvRpkc0n1CccRoZSRWxKIVClXR0uGx1giPcs/exec';

  try {
    const params = new URLSearchParams(req.query);

    const response = await fetch(
      `${APPS_SCRIPT_URL}?${params.toString()}`
    );

    const data = await response.json();

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
