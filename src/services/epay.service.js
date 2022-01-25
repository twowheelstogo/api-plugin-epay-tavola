import fetch from "node-fetch";
import AbortController from "abort-controller";
import { EpayConstant } from "../constants/index.js";
import { EpayModel } from "../models/index.js";
const TIME_EPAY = 60000;

const serviceInvoice = async (body, action = 1) => {
  const invoiceUrl = process.env.INVOICE_URL;
  const res = await fetch(`${invoiceUrl}/api/epay?action=${action}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" }
  });
  if (!res.ok) {
    throw new Error("Error en la comunicación");
  }
  const data = await res.json();
  const error = EpayConstant[data.responseCode];
  if (error) {
    throw new Error(error);
  } else if (data.responseCode !== "00") {
    throw new Error("error desconocido en el sistema de cobros");
  }
  return data;
};

const serviceEpay = async (model, action) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, TIME_EPAY);
  let hasError = false;
  let res = null;

  const epayUrl = process.env.EPAY_URL;
  let xml = EpayModel.modelToXml(model, action);
  const option = {
    signal: controller.signal,
    method: "POST",
    body: xml,
    headers: {
      "Content-Type": "text/xml; charset=utf-8"
    }
  };
  try {
    res = await fetch(`${epayUrl}?WSDL`, option);
  } catch (_error) {
    console.log("paso aca");
    console.log(_error);
    xml = EpayModel.modelToXml(model, action, true);
    option.body = xml;
    console.log("hola");
    await fetch(`${epayUrl}?WSDL`, option);
    console.log("si")
    hasError = true;
  } finally {
    clearTimeout(timeout);
  }
  if (hasError) {
    throw new Error("Error en la comunicación del sevicios de cobros");
  }
  if (!res.ok) {
    xml = EpayModel.modelToXml(model, action, true);
    option.body = xml;
    await fetch(`${epayUrl}?WSDL`, option);
    throw new Error("Error en la comunicación del sevicios de cobros");
  }
  const data = await EpayModel.resToJson(res);
  const error = EpayConstant[data.responseCode];
  if (error) {
    throw new Error(error);
  } else if (data.responseCode !== "00") {
    throw new Error("error desconocido en el sistema de cobros");
  }
  return data;
};

export default {
  serviceInvoice,
  serviceEpay
};
