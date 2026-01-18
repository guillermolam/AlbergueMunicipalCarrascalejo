use std::fmt;
use std::fmt::{Display, Formatter};

#[derive(Debug, PartialEq)]
pub struct Error {
    pub msg: &'static str,
    pub typ: Type,
}

impl Display for Error {
    fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}: {}", self.typ, self.msg)
    }
}

impl std::error::Error for Error {}

#[derive(Debug, PartialEq)]
pub enum Type {
    Invalid,
    Expired,
    Early,
    Certificate,
    Key,
    Connection,
    Header,
    Payload,
    Signature,}

pub(crate) fn err(msg: &'static str, typ: Type) -> Error {
    Error { msg, typ }
}

pub(crate) fn err_inv(msg: &'static str) -> Error {
    err(msg, Type::Invalid)
}

pub(crate) fn err_exp(msg: &'static str) -> Error {
    err(msg, Type::Expired)
}

pub(crate) fn err_nbf(msg: &'static str) -> Error {
    err(msg, Type::Early)
}

pub(crate) fn err_cer(msg: &'static str) -> Error {
    err(msg, Type::Certificate)
}

pub(crate) fn err_key(msg: &'static str) -> Error {
    err(msg, Type::Key)
}

pub(crate) fn err_con(msg: &'static str) -> Error {
    err(msg, Type::Connection)
}

pub(crate) fn err_hea(msg: &'static str) -> Error {
    err(msg, Type::Header)
}

pub(crate) fn err_pay(msg: &'static str) -> Error {
    err(msg, Type::Payload)
}

pub(crate) fn err_sig(msg: &'static str) -> Error {
    err(msg, Type::Signature)
}